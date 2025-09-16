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
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Recent Winners</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {winners.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No winners yet</p>
        ) : (
          winners.map((winner) => (
            <div
              key={winner.id}
              className="border-l-4 border-mint-500 pl-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm">{formatAddress(winner.wallet)}</p>
                  <p className="text-xs text-gray-500">
                    {formatPercentage(winner.probability)}% chance
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-mint-600">{formatSOL(winner.payoutLamports)} SOL</p>
                  <a
                    href={`https://solscan.io/tx/${winner.txSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
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