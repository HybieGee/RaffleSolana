import { Env } from '../index';
import { hasCreatorFeeInstruction, calculateBalanceChange, extractCoinMint } from '../lib/pumpfun';
import { upsertClaim } from '../lib/d1';

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
    console.log('Last checked signature:', lastChecked);

    // Use Alchemy endpoint - monitor YOUR CREATOR WALLET directly
    const alchemyKey = env.ALCHEMY_API_KEY || 'SYEG70FAIl_t9bDEkh4ki';
    const rpcUrl = `https://solana-mainnet.g.alchemy.com/v2/${alchemyKey}`;
    // Monitor YOUR creator wallet directly for incoming transfers
    const creatorWallet = env.CREATOR_WALLET;

    console.log(`Using Alchemy key: ${alchemyKey ? 'Yes' : 'No (fallback)'}`);
    console.log(`Monitoring creator wallet: ${creatorWallet}`);

    const transactions = await fetchRecentTransactions(creatorWallet, rpcUrl, lastChecked);

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

      // Find the creator wallet index in the transaction
      const accountKeys = tx.transaction?.message?.accountKeys || [];
      const creatorIndex = accountKeys.findIndex((key: any) => {
        const address = typeof key === 'string' ? key : key.pubkey;
        return address === env.CREATOR_WALLET;
      });

      if (creatorIndex === -1) {
        console.log(`Creator wallet not found in transaction ${tx.signature}`);
        continue;
      }

      // Check if this transaction shows an incoming SOL transfer to creator wallet
      const preBalance = tx.meta?.preBalances?.[creatorIndex] || 0;
      const postBalance = tx.meta?.postBalances?.[creatorIndex] || 0;
      const balanceChange = postBalance - preBalance;

      console.log(`Transaction ${tx.signature}: Creator wallet at index ${creatorIndex}, balance change: ${balanceChange / 1e9} SOL`);

      if (balanceChange > 0) {
        const claim = {
          sig: tx.signature,
          ts: tx.blockTime || Math.floor(Date.now() / 1000),
          amount_lamports: balanceChange,
          amount_sol: balanceChange / 1e9,
          labels: ['alchemy_poll'],
          coin_mint: null,
          source: 'alchemy' as const
        };

        await upsertClaim(env.D1_CLAIMS, claim);
        newClaims++;
        console.log(`✅ Found new claim: ${claim.sig} - ${claim.amount_sol} SOL`);

        // Invalidate cache
        await Promise.all(['7d', '30d', 'all'].map(key =>
          env.KV_SUMMARY.delete(`creatorClaims:summary:${key}`)
        ));

        // Auto-trigger raffle for new claims
        try {
          console.log(`🎰 Triggering raffle for new claim: ${claim.sig}`);

          // Use service binding for direct worker-to-worker communication
          const raffleResponse = await env.RAFFLE_SERVICE.fetch('https://raffle-worker/admin/force-draw', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.ADMIN_TOKEN || 'raffle_admin_2024'}`,
              'Content-Type': 'application/json'
            }
          });

          if (raffleResponse.ok) {
            console.log(`✅ Raffle triggered successfully for claim: ${claim.sig}`);
          } else {
            console.error(`❌ Failed to trigger raffle: ${raffleResponse.status} ${raffleResponse.statusText}`);
          }
        } catch (raffleError) {
          console.error('❌ Failed to trigger raffle, but continuing with claim storage:', raffleError);
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
        limit: 50,
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
  for (const sig of signatures) { // Process all signatures
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
        commitment: "confirmed",
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