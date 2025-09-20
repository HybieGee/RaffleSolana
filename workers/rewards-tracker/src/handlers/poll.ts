import { Env } from '../index';
import { parsePumpClaim } from '../utils/parser';
import { storeClaim } from '../utils/storage';

// Use Alchemy RPC with API key
function getAlchemyRpcUrl(apiKey: string): string {
  return `https://solana-mainnet.g.alchemy.com/v2/${apiKey}`;
}

// Use Helius RPC with API key
function getHeliusRpcUrl(apiKey: string): string {
  return `https://api.helius.xyz/v0/transactions?api-key=${apiKey}`;
}

export async function handlePollForClaims(env: Env): Promise<Response> {
  try {
    console.log('Polling for claims...');

    // Get last checked signature from KV
    const lastChecked = await env.KV_SUMMARY.get('last_checked_signature');

    // Use Alchemy endpoint directly - monitor the Pump.fun fee source wallet for outgoing transactions
    const rpcUrl = 'https://solana-mainnet.g.alchemy.com/v2/SYEG70FAIl_t9bDEkh4ki';
    const sourceWallet = env.PUMP_FEE_SOURCE_WALLET || 'GxXdDDuP52RrbN9dXqqiPA8npxH48thqMwij4YBrkwPU';
    const transactions = await fetchRecentTransactions(sourceWallet, rpcUrl, lastChecked);

    let newClaims = 0;
    let checkedCount = 0;

    for (const tx of transactions) {
      checkedCount++;

      // Check if already processed
      const existing = await env.D1_CLAIMS.prepare(
        'SELECT id FROM claims WHERE id = ?'
      ).bind(tx.signature).first();

      if (existing) {
        console.log(`Already processed: ${tx.signature}`);
        continue;
      }

      // Parse for Pump.fun claims
      const claim = await parsePumpClaim(tx, env);

      if (claim) {
        await storeClaim(env.D1_CLAIMS, claim);
        newClaims++;
        console.log(`Found new claim: ${claim.signature} - ${claim.amountSol} SOL`);

        // Invalidate cache
        await Promise.all(['7d', '30d', 'all'].map(key =>
          env.KV_SUMMARY.delete(`creatorClaims:summary:${key}`)
        ));

        // Auto-trigger raffle for new claims
        try {
          if (env.RAFFLE_WORKER_URL) {
            console.log(`Attempting to trigger raffle for new claim: ${claim.signature}`);
            // We'll trigger this asynchronously to not block the polling
            // The raffle system will check if this claim has already been processed
          }
        } catch (raffleError) {
          console.error('Failed to trigger raffle, but continuing with claim storage:', raffleError);
        }
      }
    }

    // Update last checked signature
    if (transactions.length > 0) {
      await env.KV_SUMMARY.put('last_checked_signature', transactions[0].signature);
    }

    // Log poll stats
    await env.KV_SUMMARY.put('last_poll', JSON.stringify({
      timestamp: new Date().toISOString(),
      checked: checkedCount,
      newClaims: newClaims
    }));

    return new Response(
      JSON.stringify({
        success: true,
        checked: checkedCount,
        newClaims: newClaims,
        message: `Checked ${checkedCount} transactions, found ${newClaims} new claims`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Poll error:', error);
    return new Response(
      JSON.stringify({
        error: 'Poll failed',
        details: error instanceof Error ? error.message : 'Unknown error'
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

async function fetchRecentTransactions(
  wallet: string,
  rpcUrl: string,
  before?: string | null
): Promise<any[]> {
  const requestBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [
      wallet,
      {
        limit: 20,
        ...(before && { before: before })
      }
    ]
  };

  console.log(`Fetching from ${rpcUrl} for wallet ${wallet}`);

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`RPC error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  const signatures = data.result || [];
  console.log(`Found ${signatures.length} signatures`);

  // Fetch full transaction details for each signature
  const transactions = [];
  for (const sig of signatures.slice(0, 10)) { // Limit to 10 to avoid timeout
    try {
      const tx = await fetchTransaction(sig.signature, rpcUrl);
      if (tx) {
        transactions.push({
          ...tx,
          signature: sig.signature,
          blockTime: sig.blockTime
        });
      }
    } catch (error) {
      console.error(`Error fetching transaction ${sig.signature}:`, error);
    }
  }

  return transactions;
}

async function fetchTransaction(
  signature: string,
  rpcUrl: string
): Promise<any> {
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

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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