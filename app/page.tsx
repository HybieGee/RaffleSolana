'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import RaffleMachine from '@/components/RaffleMachine'
import Countdown from '@/components/Countdown'
import RecentWinners from '@/components/RecentWinners'
import HowItWorks from '@/components/HowItWorks'
import { RaffleStatus, Winner } from '@/types'

export default function HomePage() {
  const [status, setStatus] = useState<RaffleStatus | null>(null)
  const [winners, setWinners] = useState<Winner[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [claimDetected, setClaimDetected] = useState<{ amount: number; signature: string } | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status')
        const data = await response.json() as RaffleStatus
        setStatus(data)
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }

    const fetchWinners = async () => {
      try {
        const response = await fetch('/api/winners?limit=10')
        const data = await response.json() as Winner[]
        setWinners(data)
      } catch (error) {
        console.error('Failed to fetch winners:', error)
      }
    }

    fetchStatus()
    fetchWinners()

    const statusInterval = setInterval(fetchStatus, 5000)
    const winnersInterval = setInterval(fetchWinners, 20000)

    const eventSource = new EventSource('/stream')

    eventSource.addEventListener('claim_detected', (event) => {
      const data = JSON.parse(event.data)
      setClaimDetected(data)
      // Show claim notification for 5 seconds
      setTimeout(() => setClaimDetected(null), 5000)
    })

    eventSource.addEventListener('drawing', () => {
      setIsDrawing(true)
    })

    eventSource.addEventListener('selected_winners', (event) => {
      const newWinners = JSON.parse(event.data)
      setWinners(prev => [...newWinners, ...prev].slice(0, 10))
      setIsDrawing(false)
    })

    eventSource.addEventListener('payouts_sent', () => {
      fetchStatus()
      fetchWinners()
      setClaimDetected(null)
    })

    return () => {
      clearInterval(statusInterval)
      clearInterval(winnersInterval)
      eventSource.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header totalPaid={status?.totalPaid || 0} />

        {claimDetected && (
          <div className="mt-4 mb-4 bg-gradient-to-r from-yellow-300 to-orange-300 border-4 border-yellow-500 rounded-xl p-8 animate-pulse shadow-2xl">
            <p className="text-5xl font-bold text-center text-yellow-900 mb-2">
              🎯 CLAIM DETECTED! 🎯
            </p>
            <p className="text-4xl font-bold text-center text-yellow-800 mb-2">
              {(claimDetected.amount / 1000000000).toFixed(3)} SOL
            </p>
            <p className="text-2xl text-center text-yellow-700 font-semibold">
              🎰 RAFFLE STARTING NOW! 🎰
            </p>
            <div className="mt-4 text-center">
              <span className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-full font-bold">
                LIVE ON STREAM
              </span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <div className="space-y-8">
            <RaffleMachine isDrawing={isDrawing} />
            <Countdown nextDrawTime={status?.nextDrawTime || Date.now() + 1200000} />
          </div>

          <div className="space-y-8">
            <RecentWinners winners={winners} />
            <HowItWorks />
          </div>
        </div>
      </div>
    </div>
  )
}