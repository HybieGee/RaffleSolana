import { handleHeliusWebhook } from './handlers/webhook';
import { handleGetClaims, handleGetSummary } from './handlers/api';
import { handleReconcile } from './handlers/reconcile';
import { handleHealth } from './handlers/health';
import { handleUsageStats } from './handlers/usage';
import { handleDebugInfo } from './handlers/debug';
import { handlePollForClaims } from './handlers/poll';
import { handleTriggerRaffle } from './handlers/raffle-trigger';

export interface Env {
  D1_CLAIMS: D1Database;
  KV_SUMMARY: KVNamespace;
  RAFFLE_SERVICE: Fetcher;
  CREATOR_WALLET: string;
  PUMP_FEE_SOURCE_WALLET: string;
  PUMP_PROGRAM_ID: string;
  HELIUS_API_KEY: string;
  ALCHEMY_API_KEY: string;
  ALLOWED_WEBHOOK_KEY: string;
  RAFFLE_WORKER_URL: string;
  RAFFLE_API_KEY: string;
  ADMIN_TOKEN: string;
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
        case path === '/api/hooks/helius' && request.method === 'POST':
          return await handleHeliusWebhook(request, env, ctx);

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
    } catch (error) {
      console.error('Scheduled polling error:', error);
    }
  },
};