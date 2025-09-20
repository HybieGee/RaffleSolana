import { Env } from '../types'

export interface RewardsClaim {
  signature: string
  time: number
  amountSol: number
  wallet: string
}

export interface ClaimData {
  amount: number
  signature: string
  timestamp: number
}

/**
 * Check for new claims from the rewards tracker system
 * This replaces the old pump-fees detection with our new reliable tracker
 */
export async function detectNewClaimFromTracker(env: Env): Promise<ClaimData | null> {
  try {
    // Get claims from our rewards tracker API
    const rewardsWorkerUrl = env.REWARDS_WORKER_URL || 'https://rewards-tracker.claudechaindev.workers.dev'

    // Get the last processed claim signature
    const lastProcessedClaim = await env.KV_RAFFLE.get('last_processed_claim_sig')
    const lastClaimTime = await env.KV_RAFFLE.get('last_claim_time')

    // Fetch recent claims from rewards tracker
    const response = await fetch(`${rewardsWorkerUrl}/api/creator-claims?limit=10`)
    if (!response.ok) {
      console.error('Failed to fetch claims from rewards tracker:', response.statusText)
      return null
    }

    const claims: RewardsClaim[] = await response.json()

    if (claims.length === 0) {
      return null
    }

    // Sort claims by time (newest first)
    claims.sort((a, b) => b.time - a.time)

    // Find the most recent unprocessed claim
    for (const claim of claims) {
      // Skip if we've already processed this claim
      if (lastProcessedClaim === claim.signature) {
        break
      }

      // Check if this claim is newer than our last processed time
      const claimTimeMs = claim.time * 1000
      const lastProcessedTimeMs = lastClaimTime ? parseInt(lastClaimTime) : 0

      if (claimTimeMs > lastProcessedTimeMs) {
        console.log(`🎯 NEW CLAIM DETECTED FROM TRACKER: ${claim.amountSol} SOL`)
        console.log(`Transaction: ${claim.signature}`)

        return {
          amount: Math.floor(claim.amountSol * 1000000000), // Convert SOL to lamports
          signature: claim.signature,
          timestamp: claimTimeMs
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error detecting claim from rewards tracker:', error)

    // Fallback to mock for development
    if (env.NETWORK === 'devnet') {
      const mockAmount = Math.floor(Math.random() * 900000000) + 100000000
      return {
        amount: mockAmount,
        signature: 'mock_' + Math.random().toString(36).substring(7),
        timestamp: Date.now()
      }
    }

    return null
  }
}

/**
 * Trigger the raffle system when a new claim is detected
 */
export async function triggerRaffleFromClaim(env: Env): Promise<boolean> {
  try {
    // Call the raffle worker's force draw endpoint
    const raffleWorkerUrl = env.RAFFLE_WORKER_URL || 'https://raffle-worker.YOUR_SUBDOMAIN.workers.dev'

    const response = await fetch(`${raffleWorkerUrl}/force-draw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RAFFLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to trigger raffle:', response.statusText)
      return false
    }

    console.log('✅ Raffle triggered successfully')
    return true
  } catch (error) {
    console.error('Error triggering raffle:', error)
    return false
  }
}