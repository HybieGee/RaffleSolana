import { Env } from '../types'
import { runRaffle } from '../services/raffle'

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  ctx.waitUntil(runRaffle(env))
}