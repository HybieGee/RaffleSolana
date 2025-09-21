// Helius backfill handler for historical creator fee claims
import { Env } from '../index';
import { fetchHeliusHistory, handleHeliusWebhook as processHeliusEvents } from '../lib/helius';
import { batchUpsertClaims } from '../lib/d1';
import { hasCreatorFeeInstruction, calculateBalanceChange, extractCoinMint } from '../lib/pumpfun';

export async function handleBackfill(request: Request, env: Env): Promise<Response> {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);
    if (!env.BACKFILL_TOKEN || token !== env.BACKFILL_TOKEN) {
      return new Response('Invalid token', { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const fromTs = parseInt(url.searchParams.get('from') || '0');
    const toTs = parseInt(url.searchParams.get('to') || String(Math.floor(Date.now() / 1000)));
    const cursor = url.searchParams.get('cursor') || undefined;
    const source = url.searchParams.get('source') || 'helius'; // 'helius' or 'alchemy'

    console.log(`Backfill request: from=${fromTs}, to=${toTs}, source=${source}, cursor=${cursor}`);

    let totalProcessed = 0;
    let totalClaims = 0;
    let nextCursor: string | undefined;

    if (source === 'helius') {
      // Use Helius Enhanced Transactions API
      if (!env.HELIUS_API_KEY) {
        return new Response('Helius API key not configured', { status: 500 });
      }

      try {
        const response = await fetchHeliusHistory(
          env.HELIUS_API_KEY,
          env.CREATOR_WALLET,
          fromTs,
          toTs,
          cursor
        );

        totalProcessed = response.transactions.length;
        nextCursor = response.nextCursor;

        console.log(`Fetched ${totalProcessed} transactions from Helius`);

        // Process transactions using Helius event format
        const claims = await processHeliusEvents(response.transactions, env.CREATOR_WALLET);

        if (claims.length > 0) {
          totalClaims = await batchUpsertClaims(env.D1_CLAIMS, claims);
          console.log(`Stored ${totalClaims}/${claims.length} claims from Helius backfill`);
        }

      } catch (error) {
        console.error('Helius backfill error:', error);
        return new Response(JSON.stringify({
          error: 'Helius API error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else if (source === 'alchemy') {
      // Use Alchemy RPC as fallback
      if (!env.ALCHEMY_RPC_URL) {
        return new Response('Alchemy RPC URL not configured', { status: 500 });
      }

      try {
        // Fetch signatures for the wallet in the time range
        const signatures = await fetchAlchemySignatures(
          env.ALCHEMY_RPC_URL,
          env.CREATOR_WALLET,
          fromTs,
          toTs,
          cursor
        );

        totalProcessed = signatures.length;

        console.log(`Fetched ${totalProcessed} signatures from Alchemy`);

        const claims = [];

        // Process each transaction
        for (const sigInfo of signatures) {
          try {
            const transaction = await fetchAlchemyTransaction(env.ALCHEMY_RPC_URL, sigInfo.signature);

            if (!transaction) continue;

            // Check if it's a creator fee transaction
            if (!hasCreatorFeeInstruction(transaction)) continue;

            // Calculate balance change for creator wallet
            const amountLamports = calculateBalanceChange(transaction, env.CREATOR_WALLET);

            if (amountLamports <= 0) continue;

            // Extract coin mint if available
            const coinMint = extractCoinMint(transaction);

            claims.push({
              sig: sigInfo.signature,
              ts: sigInfo.blockTime || Math.floor(Date.now() / 1000),
              amount_lamports: amountLamports,
              amount_sol: amountLamports / 1e9,
              labels: ['collect_creator_fee'], // Default label for Alchemy-sourced claims
              coin_mint: coinMint,
              source: 'alchemy' as const
            });

          } catch (txError) {
            console.error(`Error processing transaction ${sigInfo.signature}:`, txError);
          }
        }

        if (claims.length > 0) {
          totalClaims = await batchUpsertClaims(env.D1_CLAIMS, claims);
          console.log(`Stored ${totalClaims}/${claims.length} claims from Alchemy backfill`);
        }

      } catch (error) {
        console.error('Alchemy backfill error:', error);
        return new Response(JSON.stringify({
          error: 'Alchemy API error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else {
      return new Response('Invalid source. Use "helius" or "alchemy"', { status: 400 });
    }

    return new Response(JSON.stringify({
      success: true,
      source,
      processed: totalProcessed,
      claims: totalClaims,
      nextCursor,
      message: `Backfilled ${totalClaims} claims from ${totalProcessed} transactions using ${source}`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(JSON.stringify({
      error: 'Backfill failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to fetch signatures from Alchemy
async function fetchAlchemySignatures(
  rpcUrl: string,
  wallet: string,
  from: number,
  to: number,
  before?: string
): Promise<Array<{ signature: string; blockTime: number; err?: any }>> {
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [
      wallet,
      {
        limit: 100,
        ...(before && { before })
      }
    ]
  };

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Alchemy RPC error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`Alchemy RPC error: ${data.error.message}`);
  }

  const signatures = data.result || [];

  // Filter by time range
  return signatures.filter((sig: any) => {
    return sig.blockTime >= from && sig.blockTime <= to && !sig.err;
  });
}

// Helper function to fetch transaction from Alchemy
async function fetchAlchemyTransaction(rpcUrl: string, signature: string): Promise<any> {
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      signature,
      {
        encoding: "jsonParsed",
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0
      }
    ]
  };

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}