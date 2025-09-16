import { Env } from '../types'

export async function getRecentWinners(env: Env, limit: number = 100): Promise<any[]> {
  const results = await env.D1_RAFFLE
    .prepare(
      `SELECT w.*, d.started_at as timestamp
       FROM winners w
       JOIN draws d ON w.draw_id = d.draw_id
       ORDER BY d.started_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all()

  return results.results || []
}