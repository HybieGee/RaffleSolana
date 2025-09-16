import { Env } from '../types'

export async function getStatus(env: Env): Promise<any> {
  const lastDrawTime = await env.KV_RAFFLE.get('last_draw_time')
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
    totalPaid: totalPaid ? parseInt(totalPaid) : 0,
    currentFeePool: 100000000,
    holdersCount: 0
  }
}