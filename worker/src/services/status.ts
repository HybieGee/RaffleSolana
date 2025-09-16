import { Env } from '../types'
import { getFeePool } from './fee-pool'

export async function getStatus(env: Env): Promise<any> {
  const lastDrawTime = await env.KV_RAFFLE.get('last_draw_time')
  const totalPaid = await env.KV_RAFFLE.get('total_paid')

  const nextDrawTime = lastDrawTime
    ? parseInt(lastDrawTime) + 20 * 60 * 1000
    : Date.now() + 20 * 60 * 1000

  const lastDraw = await env.D1_RAFFLE
    .prepare('SELECT * FROM draws ORDER BY started_at DESC LIMIT 1')
    .first()

  // Get fee pool status
  const feePool = await getFeePool(env)

  // Define raffle amount (same as in raffle.ts)
  const RAFFLE_AMOUNT = 100000000 // 0.1 SOL

  return {
    nextDrawTime,
    lastDrawId: lastDraw?.draw_id,
    totalPaid: totalPaid ? parseInt(totalPaid) : 0,
    feePool: {
      balance: feePool.availableBalance,
      rafflesAvailable: Math.floor(feePool.availableBalance / RAFFLE_AMOUNT),
      nextRaffleAmount: RAFFLE_AMOUNT,
      lastClaimAmount: feePool.lastClaimAmount,
      totalClaimed: feePool.totalClaimed,
      totalDistributed: feePool.totalDistributed
    },
    holdersCount: 0
  }
}