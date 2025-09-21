// Helius Enhanced Transactions webhook handler
import { Env } from '../index';
import { verifyHeliusSignature, handleHeliusWebhook as processHeliusEvents, HeliusEvent } from '../lib/helius';
import { batchUpsertClaims } from '../lib/d1';

export async function handleHeliusWebhook(request: Request, env: Env): Promise<Response> {
  try {
    // Get raw body for HMAC verification
    const body = await request.text();
    const signature = request.headers.get('X-Signature') || request.headers.get('x-signature') || '';

    // Verify HMAC signature
    if (!env.WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const isValid = await verifyHeliusSignature(body, signature, env.WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse payload
    let events: HeliusEvent[];
    try {
      const payload = JSON.parse(body);
      events = Array.isArray(payload) ? payload : [payload];
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log(`Received ${events.length} Helius events`);

    // Process events and extract claims
    const claims = await processHeliusEvents(events, env.CREATOR_WALLET);

    if (claims.length === 0) {
      console.log('No valid creator fee claims found in Helius events');
      return new Response(JSON.stringify({
        success: true,
        processed: events.length,
        claims: 0,
        message: 'No creator fee claims found'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store claims in D1
    const storedCount = await batchUpsertClaims(env.D1_CLAIMS, claims);

    console.log(`Stored ${storedCount}/${claims.length} new claims from Helius`);

    // If we stored any new claims, trigger a raffle
    if (storedCount > 0) {
      try {
        console.log(`🎰 Triggering raffle for ${storedCount} new Helius claims`);

        const raffleResponse = await env.RAFFLE_SERVICE.fetch('https://raffle-worker/admin/force-draw', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.ADMIN_TOKEN || 'raffle_admin_2024'}`,
            'Content-Type': 'application/json'
          }
        });

        if (raffleResponse.ok) {
          console.log(`✅ Raffle triggered successfully for Helius claims`);
        } else {
          console.error(`❌ Failed to trigger raffle: ${raffleResponse.status} ${raffleResponse.statusText}`);
        }
      } catch (raffleError) {
        console.error('❌ Failed to trigger raffle from Helius webhook:', raffleError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: events.length,
      claims: storedCount,
      message: `Processed ${events.length} events, stored ${storedCount} new claims`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Helius webhook error:', error);
    return new Response(JSON.stringify({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}