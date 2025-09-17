import { Env } from '../types'

export async function getStatus(env: Env): Promise<any> {
  const lastDrawTime = await env.KV_RAFFLE.get('last_draw_time')
  const lastClaimTime = await env.KV_RAFFLE.get('last_claim_time')
  const totalPaid = await env.KV_RAFFLE.get('total_paid')

  const nextDrawTime = lastDrawTime
    ? parseInt(lastDrawTime) + 20 * 60 * 1000
    : Date.now() + 20 * 60 * 1000

  const lastDraw = await env.D1_RAFFLE
    .prepare('SELECT * FROM draws ORDER BY started_at DESC LIMIT 1')
    .first()

  return {
    nextDrawTime,
    lastDrawId: lastDraw?.draw_id,
    lastClaimTime: lastClaimTime ? parseInt(lastClaimTime) : null,
    totalPaid: totalPaid ? parseInt(totalPaid) : 0,
    message: 'Raffle runs automatically when you claim fees on Pump.fun',
    holdersCount: 0
  }
}