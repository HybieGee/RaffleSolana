import { Env } from '../index';
import { parsePumpClaim } from '../utils/parser';
import { storeClaim } from '../utils/storage';

export async function handleHeliusWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Verify webhook secret
  const authHeader = request.headers.get('X-Webhook-Secret');
  if (authHeader !== env.ALLOWED_WEBHOOK_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const webhookData = await request.json() as any;
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));

    // Handle both single transaction and batch formats
    const transactions = Array.isArray(webhookData) ? webhookData : [webhookData];

    for (const txData of transactions) {
      // Parse the transaction for Pump.fun claims
      const claim = await parsePumpClaim(txData, env);

      if (claim) {
        // Store the claim in D1
        await storeClaim(env.D1_CLAIMS, claim);

        // Invalidate summary cache
        ctx.waitUntil(invalidateSummaryCache(env.KV_SUMMARY));

        console.log(`Stored claim: ${claim.signature} - ${claim.amountSol} SOL`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 500 to trigger Helius retry
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function invalidateSummaryCache(kv: KVNamespace): Promise<void> {
  const cacheKeys = ['7d', '30d', 'all'];
  await Promise.all(
    cacheKeys.map(key => kv.delete(`creatorClaims:summary:${key}`))
  );
}