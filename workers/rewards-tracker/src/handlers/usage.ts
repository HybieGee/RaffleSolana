import { Env } from '../index';

export async function handleUsageStats(env: Env): Promise<Response> {
  try {
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));

    // Get hourly usage
    const hourlyData = await env.KV_SUMMARY.get(`webhook_rate_limit:${currentHour}`, 'json') as { count: number } | null;
    const hourlyCount = hourlyData?.count || 0;

    // Get daily usage (sum of all hours today)
    let dailyCount = 0;
    const startOfDay = currentDay * 24;
    for (let hour = startOfDay; hour <= currentHour; hour++) {
      const hourData = await env.KV_SUMMARY.get(`webhook_rate_limit:${hour}`, 'json') as { count: number } | null;
      dailyCount += hourData?.count || 0;
    }

    const stats = {
      currentHour: {
        count: hourlyCount,
        limit: 100,
        remaining: Math.max(0, 100 - hourlyCount)
      },
      today: {
        count: dailyCount,
        estimatedMonthlyCost: dailyCount * 30 // Rough estimate
      },
      limits: {
        hourly: 100,
        freeMonthly: 100000,
        status: dailyCount * 30 > 100000 ? 'APPROACHING_LIMIT' : 'OK'
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(stats, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get usage stats' }),
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