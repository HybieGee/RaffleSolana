import { handleHeliusWebhook } from './handlers/webhook';
import { handleGetClaims, handleGetSummary } from './handlers/api';
import { handleReconcile } from './handlers/reconcile';
import { handleHealth } from './handlers/health';

export interface Env {
  D1_CLAIMS: D1Database;
  KV_SUMMARY: KVNamespace;
  CREATOR_WALLET: string;
  PUMP_PROGRAM_ID: string;
  HELIUS_API_KEY: string;
  ALLOWED_WEBHOOK_KEY: string;
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

        case path === '/internal/reconcile' && request.method === 'POST':
          return await handleReconcile(request, env, ctx);

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
};