import { Env, DrawResult } from '../types'

export async function saveDrawResult(env: Env, draw: DrawResult): Promise<void> {
  await env.D1_RAFFLE
    .prepare(
      `INSERT INTO draws (draw_id, started_at, ended_at, fee_total_lamports, odds_mode, max_weight_ratio, status, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      draw.drawId,
      draw.startedAt,
      draw.endedAt,
      draw.feeTotalLamports,
      draw.oddsMode,
      draw.maxWeightRatio,
      draw.status,
      draw.version
    )
    .run()

  for (const winner of draw.winners) {
    await env.D1_RAFFLE
      .prepare(
        `INSERT INTO winners (draw_id, wallet, probability, payout_lamports, tx_sig)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        draw.drawId,
        winner.wallet,
        winner.probability,
        winner.payoutLamports,
        winner.txSig || null
      )
      .run()
  }
}

export async function updateDrawStatus(
  env: Env,
  drawId: string,
  status: 'pending' | 'completed' | 'failed'
): Promise<void> {
  await env.D1_RAFFLE
    .prepare('UPDATE draws SET status = ?, ended_at = ? WHERE draw_id = ?')
    .bind(status, new Date().toISOString(), drawId)
    .run()
}

export async function getLastDraw(env: Env): Promise<any> {
  return await env.D1_RAFFLE
    .prepare('SELECT * FROM draws ORDER BY started_at DESC LIMIT 1')
    .first()
}