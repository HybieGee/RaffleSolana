import { Env } from '../index';

export async function handleDebugInfo(env: Env): Promise<Response> {
  // Get recent webhook attempts
  const recentWebhooks = await env.KV_SUMMARY.get('recent_webhooks', 'json') as any[] || [];

  const debugInfo = {
    configured: {
      creator_wallet: env.CREATOR_WALLET,
      pump_program_id: env.PUMP_PROGRAM_ID,
      has_api_key: !!env.HELIUS_API_KEY,
      has_webhook_key: !!env.ALLOWED_WEBHOOK_KEY
    },
    recent_webhooks: recentWebhooks.slice(0, 5),
    webhook_url: 'https://rewards-tracker.claudechaindev.workers.dev/api/hooks/helius',
    helius_config_needed: {
      webhookURL: 'https://rewards-tracker.claudechaindev.workers.dev/api/hooks/helius',
      transactionTypes: ['ANY'],
      accountAddresses: [env.CREATOR_WALLET],
      encoding: 'jsonParsed',
      webhookType: 'enhanced',
      authHeader: 'X-Webhook-Secret',
      authKey: 'webhook-secret-12345'
    },
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(debugInfo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}