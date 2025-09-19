import { Env } from '../index';
import { parsePumpClaim } from '../utils/parser';
import { storeClaim } from '../utils/storage';

export async function handleReconcile(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Verify auth
  const authHeader = request.headers.get('X-Webhook-Secret');
  if (authHeader !== env.ALLOWED_WEBHOOK_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const startSignature = url.searchParams.get('start') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '100');

  try {
    // Fetch historical signatures from Helius
    const signatures = await fetchHistoricalSignatures(
      env.CREATOR_WALLET,
      env.HELIUS_API_KEY,
      startSignature,
      limit
    );

    let processed = 0;
    let newClaims = 0;

    for (const sig of signatures) {
      // Check if already processed
      const existing = await env.D1_CLAIMS.prepare(
        'SELECT id FROM claims WHERE id = ?'
      ).bind(sig.signature).first();

      if (existing) {
        console.log(`Skipping existing claim: ${sig.signature}`);
        continue;
      }

      // Fetch full transaction
      const tx = await fetchTransaction(sig.signature, env.HELIUS_API_KEY);

      if (tx) {
        // Parse the transaction for Pump.fun claims
        const claim = await parsePumpClaim(tx, env);

        if (claim) {
          await storeClaim(env.D1_CLAIMS, claim);
          newClaims++;
          console.log(`Backfilled claim: ${claim.signature} - ${claim.amountSol} SOL`);
        }
      }

      processed++;
    }

    // Invalidate cache
    ctx.waitUntil(
      Promise.all(['7d', '30d', 'all'].map(key =>
        env.KV_SUMMARY.delete(`creatorClaims:summary:${key}`)
      ))
    );

    return new Response(
      JSON.stringify({
        processed,
        newClaims,
        message: `Processed ${processed} transactions, found ${newClaims} new claims`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Reconciliation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Reconciliation failed',
        details: errorMessage,
        wallet: env.CREATOR_WALLET
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

async function fetchHistoricalSignatures(
  wallet: string,
  apiKey: string,
  before?: string,
  limit: number = 100
): Promise<any[]> {
  // Use RPC method via Helius to get signatures, then fetch transactions
  const url = `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;

  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [
      wallet,
      {
        limit: limit,
        ...(before && { before: before })
      }
    ]
  };

  console.log('Fetching signatures with:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Helius API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`Helius API error: ${data.error.message}`);
  }

  const signatures = data.result || [];
  console.log(`Found ${signatures.length} signatures`);
  return signatures;
}

async function fetchTransaction(
  signature: string,
  apiKey: string
): Promise<any> {
  const url = `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;

  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      signature,
      {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`Failed to fetch transaction ${signature}: ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    if (data.error) {
      console.error(`Helius API error for ${signature}: ${data.error.message}`);
      return null;
    }

    return data.result;
  } catch (error) {
    console.error(`Error fetching transaction ${signature}:`, error);
    return null;
  }
}