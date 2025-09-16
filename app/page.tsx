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

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status')
        const data = await response.json()
        setStatus(data)
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }

    const fetchWinners = async () => {
      try {
        const response = await fetch('/api/winners?limit=10')
        const data = await response.json()
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
    })

    return () => {
      clearInterval(statusInterval)
      clearInterval(winnersInterval)
      eventSource.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 to-mint-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header totalPaid={status?.totalPaid || 0} />

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