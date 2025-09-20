import { Env } from '../index';

export async function handleTriggerRaffle(env: Env): Promise<Response> {
  try {
    console.log('Checking for new claims to trigger raffle...');

    // Get the last processed claim signature from raffle system
    const lastProcessedSig = await env.KV_SUMMARY.get('raffle_last_processed_claim');

    // Get recent claims
    const claimsRes = await fetch(`${env.RAFFLE_WORKER_URL || 'https://raffle-worker.YOUR_SUBDOMAIN.workers.dev'}/api/creator-claims?limit=5`);
    if (!claimsRes.ok) {
      throw new Error('Failed to fetch claims');
    }

    const claims = await claimsRes.json() as any[];

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

    // Sort by time (newest first)
    claims.sort((a: any, b: any) => b.time - a.time);
    const latestClaim = claims[0];

    // Check if this is a new claim we haven't processed for raffle
    if (lastProcessedSig === latestClaim.signature) {
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
    const raffleWorkerUrl = env.RAFFLE_WORKER_URL || 'https://raffle-worker.YOUR_SUBDOMAIN.workers.dev';

    try {
      const raffleResponse = await fetch(`${raffleWorkerUrl}/force-draw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RAFFLE_API_KEY || 'default-key'}`,
          'Content-Type': 'application/json'
        }
      });

      if (raffleResponse.ok) {
        // Mark this claim as processed for raffle
        await env.KV_SUMMARY.put('raffle_last_processed_claim', latestClaim.signature);

        console.log(`✅ Raffle triggered for claim: ${latestClaim.signature} - ${latestClaim.amountSol} SOL`);

        return new Response(JSON.stringify({
          success: true,
          message: `Raffle triggered for ${latestClaim.amountSol} SOL claim`,
          triggered: true,
          claimSignature: latestClaim.signature,
          claimAmount: latestClaim.amountSol
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