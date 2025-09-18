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
    // Fetch historical transactions from Helius
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
    return new Response(
      JSON.stringify({ error: 'Reconciliation failed' }),
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
  const url = `https://api.helius.xyz/v0/addresses/${wallet}/signatures?api-key=${apiKey}&limit=${limit}${before ? `&before=${before}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch signatures: ${response.statusText}`);
  }

  return await response.json();
}

async function fetchTransaction(
  signature: string,
  apiKey: string
): Promise<any> {
  const url = `https://api.helius.xyz/v0/transactions/${signature}?api-key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch transaction ${signature}: ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching transaction ${signature}:`, error);
    return null;
  }
}