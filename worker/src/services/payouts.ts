import { Env, Holder } from '../types'
import { sendSolanaPayment } from './solana'

interface PayoutResult {
  wallet: string
  amount: number
  signature?: string
  error?: string
}

export async function sendPayouts(
  env: Env,
  winners: Holder[],
  amountPerWinner: number,
  creatorAmount: number
): Promise<PayoutResult[]> {
  const results: PayoutResult[] = []

  for (const winner of winners) {
    try {
      const idempotencyKey = `payout:${winner.wallet}:${Date.now()}`
      const existing = await env.KV_RAFFLE.get(idempotencyKey)

      if (existing) {
        results.push({
          wallet: winner.wallet,
          amount: amountPerWinner,
          signature: existing
        })
        continue
      }

      const signature = await sendSolanaPayment(env, winner.wallet, amountPerWinner)

      await env.KV_RAFFLE.put(idempotencyKey, signature, { expirationTtl: 86400 })

      results.push({
        wallet: winner.wallet,
        amount: amountPerWinner,
        signature
      })
    } catch (error) {
      console.error(`Payout failed for ${winner.wallet}:`, error)
      results.push({
        wallet: winner.wallet,
        amount: amountPerWinner,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  try {
    const creatorSignature = await sendSolanaPayment(env, env.CREATOR_WALLET, creatorAmount)
    console.log(`Creator payout sent: ${creatorSignature}`)
  } catch (error) {
    console.error('Creator payout failed:', error)
  }

  return results
}