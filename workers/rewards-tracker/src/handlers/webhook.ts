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

  // Rate limiting: Max 100 requests per hour to protect against credit overuse
  const rateLimitKey = 'webhook_rate_limit';
  const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
  const rateLimitData = await env.KV_SUMMARY.get(`${rateLimitKey}:${currentHour}`, 'json') as { count: number } | null;

  const currentCount = rateLimitData?.count || 0;
  if (currentCount >= 100) {
    console.warn(`Rate limit exceeded: ${currentCount} requests this hour`);
    return new Response('Rate limit exceeded - protecting your Helius credits', { status: 429 });
  }

  // Increment rate limit counter
  await env.KV_SUMMARY.put(
    `${rateLimitKey}:${currentHour}`,
    JSON.stringify({ count: currentCount + 1 }),
    { expirationTtl: 3600 } // Expire after 1 hour
  );

  try {
    const webhookData = await request.json() as any;
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));

    // Log recent webhooks for debugging
    const recentWebhooks = await env.KV_SUMMARY.get('recent_webhooks', 'json') as any[] || [];
    recentWebhooks.unshift({
      timestamp: new Date().toISOString(),
      signature: webhookData.signature || 'batch',
      type: webhookData.type || 'unknown',
      accountKeys: webhookData.transaction?.message?.accountKeys?.slice(0, 3) || []
    });
    await env.KV_SUMMARY.put('recent_webhooks', JSON.stringify(recentWebhooks.slice(0, 10)));

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