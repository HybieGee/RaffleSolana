import { LAMPORTS_PER_SOL } from '@solana/web3.js'

interface HeaderProps {
  totalPaid: number
}

export default function Header({ totalPaid }: HeaderProps) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(2)
  }

  return (
    <header className="text-center">
      <h1 className="text-6xl font-bold text-mint-700 mb-4">$RAFFLE</h1>
      <div className="flex justify-center items-center gap-8 text-lg">
        <div className="bg-white rounded-lg px-6 py-3 shadow-md">
          <span className="text-gray-600">Total Paid: </span>
          <span className="font-bold text-mint-600">{formatSOL(totalPaid)} SOL</span>
        </div>
        <div className="bg-white rounded-lg px-6 py-3 shadow-md">
          <span className="text-gray-600">Contract: </span>
          <span className="font-mono text-sm">
            {process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS?.slice(0, 4)}...
            {process.env.NEXT_PUBLIC_TOKEN_MINT_ADDRESS?.slice(-4)}
          </span>
        </div>
      </div>
    </header>
  )
}