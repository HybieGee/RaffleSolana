import { handleGetClaims, handleGetSummary } from './handlers/api';
import { handleReconcile } from './handlers/reconcile';
import { handleHealth } from './handlers/health';
import { handleUsageStats } from './handlers/usage';
import { handleDebugInfo } from './handlers/debug';
import { handlePollForClaims } from './handlers/poll';
import { handleTriggerRaffle } from './handlers/raffle-trigger';
import { handleHeliusWebhook } from './handlers/helius-webhook';
import { handleBackfill } from './handlers/backfill';

export interface Env {
  D1_CLAIMS: D1Database;
  KV_SUMMARY: KVNamespace;
  RAFFLE_SERVICE: Fetcher;
  CREATOR_WALLET: string;
  PUMP_FEE_SOURCE_WALLET: string;
  PUMP_PROGRAM_ID: string;
  HELIUS_API_KEY: string;
  ALCHEMY_API_KEY: string;
  ALCHEMY_RPC_URL: string;
  WEBHOOK_SECRET: string;
  BACKFILL_TOKEN: string;
  ALLOWED_WEBHOOK_KEY: string;
  RAFFLE_WORKER_URL: string;
  RAFFLE_API_KEY: string;
  ADMIN_TOKEN: string;
  TZ?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handlers
      switch (true) {

        case path === '/api/creator-claims' && request.method === 'GET':
          return await handleGetClaims(request, env);

        case path === '/api/creator-claims/summary' && request.method === 'GET':
          return await handleGetSummary(request, env);

        case path === '/api/creator-claims/health' && request.method === 'GET':
          return await handleHealth(env);

        case path === '/api/creator-claims/usage' && request.method === 'GET':
          return await handleUsageStats(env);

        case path === '/api/creator-claims/debug' && request.method === 'GET':
          return await handleDebugInfo(env);

        case path === '/internal/reconcile' && request.method === 'POST':
          return await handleReconcile(request, env, ctx);

        case path === '/internal/poll' && request.method === 'POST':
          return await handlePollForClaims(env);

        case path === '/internal/trigger-raffle' && request.method === 'POST':
          return await handleTriggerRaffle(env);

        case path === '/internal/reset-last-checked' && request.method === 'POST':
          // Reset the last checked signature to reprocess transactions
          await env.KV_SUMMARY.delete('last_checked_signature');
          return new Response(JSON.stringify({ success: true, message: 'Last checked signature reset' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case path === '/internal/start-high-freq' && request.method === 'POST':
          // Manually start high-frequency polling for testing
          ctx.waitUntil(startHighFrequencyPolling(env));
          return new Response(JSON.stringify({ success: true, message: 'High-frequency polling started' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case path === '/internal/test-raffle' && request.method === 'POST':
          // Test raffle trigger directly using service binding
          try {
            const response = await env.RAFFLE_SERVICE.fetch('https://raffle-worker/admin/force-draw', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.ADMIN_TOKEN || 'raffle_admin_2024'}`,
                'Content-Type': 'application/json'
              }
            });

            return new Response(JSON.stringify({
              success: response.ok,
              status: response.status,
              statusText: response.statusText,
              body: await response.text()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (error) {
            return new Response(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

        case path === '/internal/reset-scan' && request.method === 'POST':
          // Reset the last checked signature to force re-scan
          await env.KV_SUMMARY.delete('last_checked_signature');
          return new Response(JSON.stringify({ success: true, message: 'Scan reset, will re-check all recent transactions' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case path === '/api/webhooks/helius' && request.method === 'POST':
          return await handleHeliusWebhook(request, env);

        case path.startsWith('/api/claims/backfill') && request.method === 'GET':
          return await handleBackfill(request, env);

        case path === '/api/claims/recent' && request.method === 'GET':
          return await handleGetClaims(request, env);

        case path === '/api/claims/totals' && request.method === 'GET':
          return await handleGetSummary(request, env);

        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled polling triggered at:', new Date().toISOString());
    try {
      await handlePollForClaims(env);

      // Start high-frequency polling for the next 60 seconds
      ctx.waitUntil(startHighFrequencyPolling(env));
    } catch (error) {
      console.error('Scheduled polling error:', error);
    }
  },
};

// High-frequency polling function
async function startHighFrequencyPolling(env: Env): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  const maxDuration = 55000; // Run for 55 seconds (less than 60 to avoid overlapping with next cron)

  async function poll() {
    try {
      if (Date.now() - startTime > maxDuration) {
        console.log('High-frequency polling session ended');
        return;
      }

      console.log('High-frequency poll check...');
      await handlePollForClaims(env);

      // Schedule next poll
      setTimeout(poll, pollInterval);
    } catch (error) {
      console.error('High-frequency polling error:', error);
      // Continue polling despite errors
      setTimeout(poll, pollInterval);
    }
  }

  // Start the polling loop
  poll();
}