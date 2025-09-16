export interface Env {
  KV_RAFFLE: KVNamespace
  D1_RAFFLE: D1Database
  SOLANA_RPC_URL: string
  TOKEN_MINT_ADDRESS: string
  CREATOR_WALLET: string
  PAYOUT_SIGNER_SECRET: string
  NETWORK: 'mainnet-beta' | 'devnet'
  ODDS_MODE: 'sqrt' | 'log'
  MAX_WEIGHT_RATIO: string
  MIN_BALANCE_FOR_ELIGIBILITY: string
  ADMIN_TOKEN?: string
}

export interface Holder {
  wallet: string
  balance: number
  weight: number
  probability: number
}

export interface DrawResult {
  drawId: string
  startedAt: string
  endedAt: string
  feeTotalLamports: number
  oddsMode: 'sqrt' | 'log'
  maxWeightRatio: number
  status: 'pending' | 'completed' | 'failed'
  version: string
  winners: WinnerResult[]
}

export interface WinnerResult {
  wallet: string
  probability: number
  payoutLamports: number
  txSig?: string
}