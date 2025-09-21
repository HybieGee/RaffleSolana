import { Env } from '../index';
import { getRecentClaims, getAllTimeTotals, getDailyTotals } from '../lib/d1';

export async function handleGetClaims(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    const claims = await getRecentClaims(env.D1_CLAIMS, limit);

    // Transform for API response
    const response = claims.map(claim => ({
      sig: claim.sig,
      ts: claim.ts,
      amountSol: claim.amount_sol,
      labels: claim.labels,
      coinMint: claim.coin_mint,
      source: claim.source
    }));

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30'
      }
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch claims' }),
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

export async function handleGetSummary(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Get all-time totals
    const allTimeTotals = await getAllTimeTotals(env.D1_CLAIMS);

    // Get daily totals for last 60 days
    const dailyTotals = await getDailyTotals(env.D1_CLAIMS, 60, env.TZ || 'Australia/Brisbane');

    const response = {
      allTime: {
        amountSol: allTimeTotals.amount_sol,
        count: allTimeTotals.count
      },
      byDay: dailyTotals
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch summary' }),
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