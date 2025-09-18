import { Env } from '../index';
import { getClaims, getClaimsSummary } from '../utils/storage';

export async function handleGetClaims(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const before = url.searchParams.get('before') || undefined;

  try {
    const claims = await getClaims(env.D1_CLAIMS, limit, before);

    return new Response(JSON.stringify(claims), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
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
  const url = new URL(request.url);
  const range = url.searchParams.get('range') as '7d' | '30d' | 'all' || 'all';

  try {
    const summary = await getClaimsSummary(env.D1_CLAIMS, env.KV_SUMMARY, range);

    return new Response(JSON.stringify(summary), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
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