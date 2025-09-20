'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import RaffleMachine from '@/components/RaffleMachine'
import Countdown from '@/components/Countdown'
import RecentWinners from '@/components/RecentWinners'
import CreatorRewards from '@/components/CreatorRewards'
import { RaffleStatus, Winner } from '@/types'

export default function HomePage() {
  const [status, setStatus] = useState<RaffleStatus | null>(null)
  const [winners, setWinners] = useState<Winner[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [claimDetected, setClaimDetected] = useState<{ amount: number; signature: string } | null>(null)

  const RAFFLE_WORKER_URL = process.env.NEXT_PUBLIC_RAFFLE_WORKER_URL || 'https://raffle-worker.claudechaindev.workers.dev'

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${RAFFLE_WORKER_URL}/api/status`)
        const data = await response.json() as RaffleStatus
        setStatus(data)
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }

    const fetchWinners = async () => {
      try {
        const response = await fetch(`${RAFFLE_WORKER_URL}/api/winners?limit=10`)
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

    const eventSource = new EventSource(`${RAFFLE_WORKER_URL}/stream`)

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
    <div className="min-h-screen bg-charcoal relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-5">
        {/* Floating circles with various animations */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-cream rounded-full animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-cream rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-cream rounded-full animate-ping delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-cream rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-1/3 left-2/3 w-12 h-12 bg-cream rounded-full animate-bounce delay-1500"></div>
        <div className="absolute bottom-1/3 right-1/5 w-28 h-28 bg-cream rounded-full animate-pulse delay-2500"></div>
        <div className="absolute top-1/5 right-2/3 w-18 h-18 bg-cream rounded-full animate-ping delay-3000"></div>

        {/* Floating shapes with custom animations */}
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
          <div className="shape shape-6"></div>
          <div className="shape shape-7"></div>
          <div className="shape shape-8"></div>
          <div className="shape shape-9"></div>
          <div className="shape shape-10"></div>
        </div>

        {/* Diagonal moving lines */}
        <div className="moving-lines">
          <div className="line line-1"></div>
          <div className="line line-2"></div>
          <div className="line line-3"></div>
        </div>

        {/* Rotating elements */}
        <div className="rotating-elements">
          <div className="rotate-element rotate-1"></div>
          <div className="rotate-element rotate-2"></div>
          <div className="rotate-element rotate-3"></div>
        </div>

        {/* Particle system */}
        <div className="particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-7xl relative z-10">
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

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <RaffleMachine isDrawing={isDrawing} />
          </div>

          <div className="space-y-4">
            <Countdown nextDrawTime={status?.nextDrawTime || Date.now() + 1200000} />
            <CreatorRewards />
            <RecentWinners winners={winners} />
          </div>
        </div>
      </div>
    </div>
  )
}