import { Env } from '../types'
import { getTokenHolders } from './solana'
import { calculateWeights } from './weights'

export async function calculateOdds(env: Env, wallet: string): Promise<any> {
  const holders = await getTokenHolders(env)
  const holder = holders.find(h => h.wallet === wallet)

  if (!holder) {
    return {
      wallet,
      balance: 0,
      weight: 0,
      probability: 0,
      odds: '0%'
    }
  }

  const weightedHolders = calculateWeights(
    holders,
    env.ODDS_MODE as 'sqrt' | 'log',
    parseFloat(env.MAX_WEIGHT_RATIO)
  )

  const weightedHolder = weightedHolders.find(h => h.wallet === wallet)

  return {
    wallet,
    balance: holder.balance,
    weight: weightedHolder?.weight || 0,
    probability: weightedHolder?.probability || 0,
    odds: `${((weightedHolder?.probability || 0) * 100).toFixed(4)}%`
  }
}