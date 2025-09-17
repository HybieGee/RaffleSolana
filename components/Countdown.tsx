import { useState, useEffect } from 'react'

interface CountdownProps {
  nextDrawTime: number
}

export default function Countdown({ nextDrawTime }: CountdownProps) {
  return (
    <div className="bg-cream rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-center mb-3 text-charcoal">
        🔴 LIVE RAFFLE SYSTEM
      </h2>
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold text-charcoal">
          Instant Raffle on Claim!
        </div>
        <div className="text-base text-gray-700">
          Claim fees on Pump.fun to trigger raffle
        </div>
        <div className="flex justify-center">
          <div className="animate-pulse bg-red-500 w-4 h-4 rounded-full mr-2"></div>
          <span className="text-red-600 font-semibold">WATCHING FOR CLAIMS</span>
        </div>
      </div>
    </div>
  )
}