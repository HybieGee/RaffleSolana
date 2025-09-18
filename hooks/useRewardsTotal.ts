'use client'

import { useState, useEffect } from 'react'

interface RewardsSummary {
  totalSol: number
  count: number
}

export function useRewardsTotal() {
  const [totalRewards, setTotalRewards] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const WORKER_URL = process.env.NEXT_PUBLIC_REWARDS_WORKER_URL || 'https://rewards-tracker.claudechaindev.workers.dev'

  useEffect(() => {
    const fetchTotal = async () => {
      try {
        const response = await fetch(`${WORKER_URL}/api/creator-claims/summary?range=all`, {
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json() as RewardsSummary
        setTotalRewards(data.totalSol)
        setError(null)
      } catch (err) {
        console.error('Error fetching total rewards:', err)
        setError('Failed to load')
        setTotalRewards(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTotal()
    const interval = setInterval(fetchTotal, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [WORKER_URL])

  return { totalRewards, isLoading, error }
}