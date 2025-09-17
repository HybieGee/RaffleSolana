import { useState, useEffect } from 'react'

interface CountdownProps {
  nextDrawTime: number
}

export default function Countdown({ nextDrawTime }: CountdownProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
        🔴 LIVE RAFFLE SYSTEM
      </h2>
      <div className="text-center space-y-4">
        <div className="text-3xl font-bold text-mint-600">
          Instant Raffle on Claim!
        </div>
        <div className="text-lg text-gray-600">
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