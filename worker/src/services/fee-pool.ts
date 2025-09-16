import { Env } from '../types'
import { collectClaimedFees } from './pump-fees'

export interface FeePool {
  availableBalance: number
  lastClaimTime: number
  lastClaimAmount: number
  totalClaimed: number
  totalDistributed: number
}

/**
 * Get the current fee pool status
 */
export async function getFeePool(env: Env): Promise<FeePool> {
  const availableBalance = await env.KV_RAFFLE.get('fee_pool_balance')
  const lastClaimTime = await env.KV_RAFFLE.get('last_claim_time')
  const lastClaimAmount = await env.KV_RAFFLE.get('last_claim_amount')
  const totalClaimed = await env.KV_RAFFLE.get('total_claimed')
  const totalDistributed = await env.KV_RAFFLE.get('total_distributed')

  return {
    availableBalance: availableBalance ? parseInt(availableBalance) : 0,
    lastClaimTime: lastClaimTime ? parseInt(lastClaimTime) : 0,
    lastClaimAmount: lastClaimAmount ? parseInt(lastClaimAmount) : 0,
    totalClaimed: totalClaimed ? parseInt(totalClaimed) : 0,
    totalDistributed: totalDistributed ? parseInt(totalDistributed) : 0
  }
}

/**
 * Update fee pool with new claims and check if enough for raffle
 */
export async function updateFeePool(env: Env): Promise<number> {
  // Check for new claims
  const newClaimedFees = await collectClaimedFees(env)

  // Get current pool balance
  const currentBalance = await env.KV_RAFFLE.get('fee_pool_balance')
  const poolBalance = currentBalance ? parseInt(currentBalance) : 0

  // Add new claims to pool
  const updatedBalance = poolBalance + newClaimedFees

  if (newClaimedFees > 0) {
    console.log(`Added ${newClaimedFees} lamports to fee pool. New balance: ${updatedBalance}`)

    // Update pool stats
    await env.KV_RAFFLE.put('fee_pool_balance', updatedBalance.toString())
    await env.KV_RAFFLE.put('last_claim_amount', newClaimedFees.toString())

    const totalClaimed = await env.KV_RAFFLE.get('total_claimed')
    const newTotalClaimed = (totalClaimed ? parseInt(totalClaimed) : 0) + newClaimedFees
    await env.KV_RAFFLE.put('total_claimed', newTotalClaimed.toString())
  }

  return updatedBalance
}

/**
 * Deduct fees from pool after successful raffle
 */
export async function deductFromPool(env: Env, amount: number): Promise<void> {
  const currentBalance = await env.KV_RAFFLE.get('fee_pool_balance')
  const poolBalance = currentBalance ? parseInt(currentBalance) : 0

  const newBalance = Math.max(0, poolBalance - amount)
  await env.KV_RAFFLE.put('fee_pool_balance', newBalance.toString())

  // Update total distributed
  const totalDistributed = await env.KV_RAFFLE.get('total_distributed')
  const newTotalDistributed = (totalDistributed ? parseInt(totalDistributed) : 0) + amount
  await env.KV_RAFFLE.put('total_distributed', newTotalDistributed.toString())

  console.log(`Deducted ${amount} lamports from pool. Remaining balance: ${newBalance}`)
}

/**
 * Check if we have enough fees for a raffle
 */
export async function hasEnoughFeesForRaffle(env: Env, minimumFees: number = 1000000): Promise<boolean> {
  const pool = await getFeePool(env)
  return pool.availableBalance >= minimumFees
}