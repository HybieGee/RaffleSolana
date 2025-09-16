import { Env, DrawResult, Holder } from '../types'
import { getTokenHolders } from './solana'
import { calculateWeights, selectWinners } from './weights'
import { sendPayouts } from './payouts'
import { saveDrawResult, updateDrawStatus } from './database'
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function runRaffle(env: Env): Promise<void> {
  const lockKey = 'raffle:lock'
  const lockValue = generateUUID()

  try {
    const existingLock = await env.KV_RAFFLE.get(lockKey)
    if (existingLock) {
      console.log('Raffle already running, skipping')
      return
    }

    await env.KV_RAFFLE.put(lockKey, lockValue, { expirationTtl: 120 })

    await updateDrawPhase(env, 'drawing', {})

    const drawId = generateUUID()
    const startedAt = new Date().toISOString()

    const creatorFees = await getCreatorFees(env)
    if (creatorFees < 1000000) {
      console.log('Insufficient fees for raffle:', creatorFees)
      await env.KV_RAFFLE.delete(lockKey)
      return
    }

    const holders = await getTokenHolders(env)
    if (holders.length < 3) {
      console.log('Not enough holders for raffle')
      await env.KV_RAFFLE.delete(lockKey)
      return
    }

    const weightedHolders = calculateWeights(
      holders,
      env.ODDS_MODE as 'sqrt' | 'log',
      parseFloat(env.MAX_WEIGHT_RATIO)
    )

    const winners = selectWinners(weightedHolders, 3)

    await updateDrawPhase(env, 'selected_winners', { winners })

    const payoutPool = Math.floor(creatorFees * 0.95)
    const payoutPerWinner = Math.floor(payoutPool / 3)
    const creatorShare = creatorFees - payoutPool

    const payoutResults = await sendPayouts(env, winners, payoutPerWinner, creatorShare)

    await updateDrawPhase(env, 'payouts_sent', { payouts: payoutResults })

    const drawResult: DrawResult = {
      drawId,
      startedAt,
      endedAt: new Date().toISOString(),
      feeTotalLamports: creatorFees,
      oddsMode: env.ODDS_MODE as 'sqrt' | 'log',
      maxWeightRatio: parseFloat(env.MAX_WEIGHT_RATIO),
      status: 'completed',
      version: '1.0.0',
      winners: winners.map((w, i) => ({
        wallet: w.wallet,
        probability: w.probability,
        payoutLamports: payoutPerWinner,
        txSig: payoutResults[i]?.signature
      }))
    }

    await saveDrawResult(env, drawResult)

    await env.KV_RAFFLE.put('last_draw_time', Date.now().toString())
    await env.KV_RAFFLE.put('total_paid', (await getTotalPaid(env) + creatorFees).toString())

    const currentLock = await env.KV_RAFFLE.get(lockKey)
    if (currentLock === lockValue) {
      await env.KV_RAFFLE.delete(lockKey)
    }
  } catch (error) {
    console.error('Raffle error:', error)
    await env.KV_RAFFLE.delete(lockKey)
    throw error
  }
}

export async function forceDrawRaffle(env: Env): Promise<void> {
  await runRaffle(env)
}

export async function retryPayout(env: Env, drawId: string): Promise<void> {
  const draw = await env.D1_RAFFLE
    .prepare('SELECT * FROM draws WHERE draw_id = ?')
    .bind(drawId)
    .first()

  if (!draw) {
    throw new Error('Draw not found')
  }

  const winners = await env.D1_RAFFLE
    .prepare('SELECT * FROM winners WHERE draw_id = ?')
    .bind(drawId)
    .all()

  for (const winner of winners.results || []) {
    if (!winner.tx_sig) {
      console.log(`Retrying payout for ${winner.wallet}`)
    }
  }
}

async function getCreatorFees(env: Env): Promise<number> {
  const mockFees = 100000000
  return mockFees
}

async function getTotalPaid(env: Env): Promise<number> {
  const total = await env.KV_RAFFLE.get('total_paid')
  return total ? parseInt(total) : 0
}

async function updateDrawPhase(env: Env, phase: string, data: any): Promise<void> {
  await env.KV_RAFFLE.put(
    'current_draw_status',
    JSON.stringify({ phase, data, timestamp: Date.now() }),
    { expirationTtl: 300 }
  )
}