import { Winner } from '@/types'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

interface RecentWinnersProps {
  winners: Winner[]
}

export default function RecentWinners({ winners }: RecentWinnersProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(3)
  }

  const formatPercentage = (probability: number) => {
    return (probability * 100).toFixed(2)
  }

  return (
    <div className="bg-cream rounded-2xl p-3 shadow-xl">
      <h2 className="text-lg font-bold mb-2 text-charcoal">Recent Winners</h2>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {winners.length === 0 ? (
          <p className="text-gray-600 text-center py-4">No winners yet</p>
        ) : (
          winners.map((winner) => (
            <div
              key={winner.id}
              className="border-l-4 border-charcoal pl-4 py-2 hover:bg-cream/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-gray-700">{formatAddress(winner.wallet)}</p>
                  <p className="text-xs text-gray-600">
                    {formatPercentage(winner.probability)}% chance
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-charcoal">{formatSOL(winner.payoutLamports)} SOL</p>
                  <a
                    href={`https://solscan.io/tx/${winner.txSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View TX
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}