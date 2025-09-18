import { Env } from '../index';

export async function handleHealth(env: Env): Promise<Response> {
  try {
    // Check D1 database
    const dbCheck = await env.D1_CLAIMS.prepare(
      'SELECT COUNT(*) as count FROM claims'
    ).first();

    // Check KV namespace
    const kvCheck = await env.KV_SUMMARY.get('health:check');

    // Get latest claim
    const latestClaim = await env.D1_CLAIMS.prepare(
      'SELECT time, amount_sol FROM claims ORDER BY time DESC LIMIT 1'
    ).first();

    const status = {
      status: 'healthy',
      database: dbCheck ? 'connected' : 'error',
      cache: 'connected',
      totalClaims: dbCheck?.count || 0,
      latestClaim: latestClaim ? {
        time: latestClaim.time,
        amountSol: latestClaim.amount_sol
      } : null,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(status), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}