import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'
import { Env } from '../types'

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
const PUMP_FUN_FEE_ACCOUNT = 'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'

export interface FeeCollection {
  totalFees: number
  transactions: string[]
  startTime: number
  endTime: number
}

export interface ClaimData {
  amount: number
  signature: string
  timestamp: number
}

export async function detectNewClaim(env: Env): Promise<ClaimData | null> {
  const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed')

  try {
    const now = Date.now()

    // Get the last processed claim transaction
    const lastProcessedClaim = await env.KV_RAFFLE.get('last_processed_claim_sig')
    const lastClaimTime = await env.KV_RAFFLE.get('last_claim_time')
    const fromTime = lastClaimTime ? parseInt(lastClaimTime) : now - (24 * 60 * 60 * 1000) // Look back 24 hours initially

    // This is the wallet where you claim fees TO (your wallet that receives claims)
    const claimReceiverWallet = new PublicKey(env.CLAIM_RECEIVER_WALLET || env.CREATOR_WALLET)

    const signatures = await connection.getSignaturesForAddress(
      claimReceiverWallet,
      { limit: 100 },
      'confirmed'
    )

    let totalClaimedFees = 0
    const processedClaims: string[] = []
    let latestClaimSig: string | null = null

    for (const sigInfo of signatures) {
      // Skip if we've already processed this claim
      if (lastProcessedClaim && sigInfo.signature === lastProcessedClaim) {
        break
      }

      if (sigInfo.blockTime && sigInfo.blockTime * 1000 >= fromTime) {
        const tx = await connection.getParsedTransaction(
          sigInfo.signature,
          { maxSupportedTransactionVersion: 0 }
        )

        if (tx && isPumpFunClaim(tx)) {
          const claimAmount = extractClaimAmount(tx, env.CLAIM_RECEIVER_WALLET || env.CREATOR_WALLET)
          if (claimAmount > 0) {
            totalClaimedFees += claimAmount
            processedClaims.push(sigInfo.signature)
            if (!latestClaimSig) {
              latestClaimSig = sigInfo.signature
            }
          }
        }
      }
    }

    // Return immediately if we found a new claim
    if (totalClaimedFees > 0 && latestClaimSig) {
      console.log(`🎰 NEW CLAIM DETECTED: ${totalClaimedFees / 1000000000} SOL`)
      return {
        amount: totalClaimedFees,
        signature: latestClaimSig,
        timestamp: now
      }
    }

    return null
  } catch (error) {
    console.error('Error detecting claim:', error)

    // Mock claim for development
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

function isPumpFunClaim(tx: ParsedTransactionWithMeta): boolean {
  if (!tx.transaction.message.accountKeys) return false

  // Check if transaction involves Pump.fun program
  const hasPumpProgram = tx.transaction.message.accountKeys.some(
    key => key.pubkey.toString() === PUMP_FUN_PROGRAM
  )

  // Check if it's from the fee account (claims come FROM this account)
  const fromFeeAccount = tx.transaction.message.accountKeys.some(
    key => key.pubkey.toString() === PUMP_FUN_FEE_ACCOUNT
  )

  return hasPumpProgram || fromFeeAccount
}

function extractClaimAmount(
  tx: ParsedTransactionWithMeta,
  claimWallet: string
): number {
  if (!tx.meta || !tx.meta.postBalances || !tx.meta.preBalances) return 0

  const accountIndex = tx.transaction.message.accountKeys.findIndex(
    key => key.pubkey.toString() === claimWallet
  )

  if (accountIndex === -1) return 0

  const preBalance = tx.meta.preBalances[accountIndex]
  const postBalance = tx.meta.postBalances[accountIndex]

  const difference = postBalance - preBalance

  return difference > 0 ? difference : 0
}

export async function getPumpFunTokenCA(env: Env): Promise<string | null> {
  try {
    const caAddress = await env.KV_RAFFLE.get('pump_fun_ca')
    if (caAddress) return caAddress

    return env.TOKEN_MINT_ADDRESS
  } catch (error) {
    console.error('Error getting Pump.fun CA:', error)
    return env.TOKEN_MINT_ADDRESS
  }
}