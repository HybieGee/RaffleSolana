import { LAMPORTS_PER_SOL } from '@solana/web3.js'

interface HeaderProps {
  totalPaid: number
}

export default function Header({ totalPaid }: HeaderProps) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(2)
  }

  const tokenAddress = 'AddFNTosWQJLqRt6THJKts2fRSMfBBSWzdLJEQVdpump'

  return (
    <header className="text-center">
      <h1 className="text-6xl font-bold text-cream mb-4">$RAFFLE</h1>
      <div className="flex justify-center items-center gap-4 text-sm">
        <div className="bg-cream rounded-lg px-4 py-2 shadow-md">
          <span className="text-gray-700">Total Paid: </span>
          <span className="font-bold text-charcoal">{formatSOL(totalPaid)} SOL</span>
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