import { Env } from '../index';

export async function handleTriggerRaffle(env: Env): Promise<Response> {
  try {
    console.log('Checking for new claims to trigger raffle...');

    // Get the last processed claim signature from raffle system
    const lastProcessedSig = await env.KV_SUMMARY.get('raffle_last_processed_claim');

    // Get recent claims directly from database
    const stmt = env.D1_CLAIMS.prepare('SELECT * FROM claims ORDER BY time DESC LIMIT 5');
    const result = await stmt.all();
    const claims = result.results as any[];

    if (claims.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No claims found',
        triggered: false
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Claims are already sorted by time DESC, so first one is latest
    const latestClaim = claims[0];

    // Check if this is a new claim we haven't processed for raffle
    if (lastProcessedSig === latestClaim.id) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No new claims to process',
        triggered: false
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Trigger the raffle worker
    const raffleWorkerUrl = env.RAFFLE_WORKER_URL || 'https://raffle-worker.claudechaindev.workers.dev';

    try {
      const raffleResponse = await fetch(`${raffleWorkerUrl}/admin/force-draw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RAFFLE_API_KEY || env.ADMIN_TOKEN || 'default-key'}`,
          'Content-Type': 'application/json'
        }
      });

      if (raffleResponse.ok) {
        // Mark this claim as processed for raffle
        await env.KV_SUMMARY.put('raffle_last_processed_claim', latestClaim.id);

        console.log(`✅ Raffle triggered for claim: ${latestClaim.id} - ${latestClaim.amount_sol} SOL`);

        return new Response(JSON.stringify({
          success: true,
          message: `Raffle triggered for ${latestClaim.amount_sol} SOL claim`,
          triggered: true,
          claimSignature: latestClaim.id,
          claimAmount: latestClaim.amount_sol
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else {
        throw new Error(`Raffle worker responded with ${raffleResponse.status}`);
      }
    } catch (raffleError) {
      console.error('Failed to trigger raffle worker:', raffleError);

      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to trigger raffle worker',
        error: raffleError instanceof Error ? raffleError.message : 'Unknown error',
        triggered: false
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    console.error('Raffle trigger error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to check claims for raffle trigger',
      error: error instanceof Error ? error.message : 'Unknown error',
      triggered: false
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}