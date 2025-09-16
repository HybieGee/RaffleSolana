export interface RaffleStatus {
  nextDrawTime: number
  lastDrawId?: string
  totalPaid: number
  currentFeePool: number
  holdersCount: number
}

export interface Winner {
  id: string
  drawId: string
  wallet: string
  probability: number
  payoutLamports: number
  txSig: string
  timestamp: string
}

export interface Draw {
  drawId: string
  startedAt: string
  endedAt: string
  feeTotalLamports: number
  oddsMode: 'sqrt' | 'log'
  maxWeightRatio: number
  status: 'pending' | 'completed' | 'failed'
  version: string
  winners: Winner[]
}