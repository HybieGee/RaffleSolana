'use client'

import { useState, useEffect } from 'react'

interface Claim {
  signature: string
  time: number
  amountSol: number
  wallet: string
}

interface ClaimSummary {
  totalSol: number
  count: number
  from: number
  to: number
}

export default function CreatorRewards() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [summary, setSummary] = useState<ClaimSummary | null>(null)
  const [summaryRange, setSummaryRange] = useState<'7d' | '30d' | 'all'>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const WORKER_URL = process.env.NEXT_PUBLIC_REWARDS_WORKER_URL || 'https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev'

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [summaryRange])

  const fetchData = async () => {
    try {
      // Fetch claims
      const claimsRes = await fetch(`${WORKER_URL}/api/creator-claims?limit=20`)
      if (!claimsRes.ok) throw new Error('Failed to fetch claims')
      const claimsData = await claimsRes.json()
      setClaims(claimsData)

      // Fetch summary
      const summaryRes = await fetch(`${WORKER_URL}/api/creator-claims/summary?range=${summaryRange}`)
      if (!summaryRes.ok) throw new Error('Failed to fetch summary')
      const summaryData = await summaryRes.json()
      setSummary(summaryData)

      setLoading(false)
    } catch (err) {
      console.error('Error fetching rewards data:', err)
      setError('Failed to load rewards data')
      setLoading(false)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatSignature = (sig: string) => {
    return `${sig.slice(0, 4)}...${sig.slice(-4)}`
  }

  return (
    <div className="bg-cream rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 text-charcoal">
        💰 Creator Rewards Tracker
      </h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-charcoal">Loading rewards data...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => setSummaryRange('7d')}
              className={`p-4 rounded-lg transition-all ${
                summaryRange === '7d' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-sm opacity-75">Last 7 Days</div>
              <div className="text-xl font-bold">
                {summaryRange === '7d' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>

            <button
              onClick={() => setSummaryRange('30d')}
              className={`p-4 rounded-lg transition-all ${
                summaryRange === '30d' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-sm opacity-75">Last 30 Days</div>
              <div className="text-xl font-bold">
                {summaryRange === '30d' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>

            <button
              onClick={() => setSummaryRange('all')}
              className={`p-4 rounded-lg transition-all ${
                summaryRange === 'all' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-sm opacity-75">All Time</div>
              <div className="text-xl font-bold">
                {summaryRange === 'all' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>
          </div>

          {/* Claims count */}
          {summary && (
            <div className="text-center mb-4 text-charcoal/60 text-sm">
              {summary.count} claims tracked
            </div>
          )}

          {/* Recent Claims Table */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-charcoal mb-2">Recent Claims</h3>
            {claims.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No claims yet</p>
            ) : (
              <div className="space-y-2">
                {claims.map((claim) => (
                  <div
                    key={claim.signature}
                    className="flex justify-between items-center p-3 bg-charcoal/5 rounded-lg hover:bg-charcoal/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-charcoal">
                        {formatTime(claim.time)}
                      </div>
                      <a
                        href={`https://solscan.io/tx/${claim.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {formatSignature(claim.signature)}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-charcoal">
                        {claim.amountSol.toFixed(6)} SOL
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}