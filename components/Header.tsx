import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useRewardsTotal } from '@/hooks/useRewardsTotal'

interface HeaderProps {
  totalPaid: number
}

export default function Header({ totalPaid }: HeaderProps) {
  const { totalRewards, isLoading, error } = useRewardsTotal()
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(2)
  }

  const tokenAddress = 'AddFNTosWQJLqRt6THJKts2fRSMfBBSWzdLJEQVdpump'

  return (
    <header className="text-center">
      <h1 className="text-5xl font-bold text-cream mb-3">$RAFFLE</h1>
      <div className="flex justify-center items-center gap-3 text-sm flex-wrap">
        <div className="bg-cream rounded-lg px-4 py-2 shadow-md">
          <span className="text-gray-700">Total Paid: </span>
          <span className="font-bold text-charcoal">{formatSOL(totalPaid)} SOL</span>
        </div>
        <div className="bg-cream rounded-lg px-4 py-2 shadow-md">
          <span className="text-gray-700">Total Rewards Accumulated: </span>
          <span className="font-bold text-charcoal">
            {isLoading ? '...' : error ? '0.00' : totalRewards.toFixed(3)} SOL
          </span>
        </div>
        <div className="bg-cream rounded-lg px-4 py-2 shadow-md">
          <span className="text-gray-700">CA: </span>
          <span className="font-mono text-xs text-charcoal">
            {tokenAddress}
          </span>
        </div>
      </div>
    </header>
  )
}