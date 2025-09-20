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
  const [summaryRange, setSummaryRange] = useState<'7d' | '30d' | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const WORKER_URL = process.env.NEXT_PUBLIC_REWARDS_WORKER_URL || 'https://rewards-tracker.claudechaindev.workers.dev'

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [summaryRange])

  const fetchData = async () => {
    try {
      setError(null)

      // Fetch claims
      const claimsRes = await fetch(`${WORKER_URL}/api/creator-claims?limit=10`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      })
      if (!claimsRes.ok) {
        throw new Error(`Claims API error: ${claimsRes.status} ${claimsRes.statusText}`)
      }
      const claimsData = await claimsRes.json() as Claim[]
      setClaims(claimsData)

      // Fetch summary
      const summaryRes = await fetch(`${WORKER_URL}/api/creator-claims/summary?range=${summaryRange}`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      })
      if (!summaryRes.ok) {
        throw new Error(`Summary API error: ${summaryRes.status} ${summaryRes.statusText}`)
      }
      const summaryData = await summaryRes.json() as ClaimSummary
      setSummary(summaryData)

      setLoading(false)
    } catch (err) {
      console.error('Error fetching rewards data:', err)
      setError(`Failed to load rewards data: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
    <div className="bg-cream rounded-2xl p-3 shadow-xl">
      <h2 className="text-lg font-bold text-center mb-4 text-charcoal">
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
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setSummaryRange('7d')}
              className={`p-2 rounded-lg transition-all text-sm ${
                summaryRange === '7d' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-xs opacity-75">Last 7 Days</div>
              <div className="text-lg font-bold">
                {summaryRange === '7d' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>

            <button
              onClick={() => setSummaryRange('30d')}
              className={`p-2 rounded-lg transition-all text-sm ${
                summaryRange === '30d' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-xs opacity-75">Last 30 Days</div>
              <div className="text-lg font-bold">
                {summaryRange === '30d' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>

            <button
              onClick={() => setSummaryRange('all')}
              className={`p-2 rounded-lg transition-all text-sm ${
                summaryRange === 'all' ? 'bg-charcoal text-cream' : 'bg-cream/50 text-charcoal border border-charcoal/20'
              }`}
            >
              <div className="text-xs opacity-75">All Time</div>
              <div className="text-lg font-bold">
                {summaryRange === 'all' && summary ? summary.totalSol.toFixed(3) : '---'} SOL
              </div>
            </button>
          </div>

          {/* Claims count */}
          {summary && (
            <div className="text-center mb-3 text-charcoal/60 text-xs">
              {summary.count} claims tracked
            </div>
          )}

          {/* Recent Claims Table */}
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-semibold text-charcoal mb-2">Recent Claims</h3>
            {claims.length === 0 ? (
              <p className="text-gray-500 text-center py-2 text-sm">No claims yet</p>
            ) : (
              <div className="space-y-1">
                {claims.map((claim) => (
                  <div
                    key={claim.signature}
                    className="flex justify-between items-center p-2 bg-charcoal/5 rounded-lg hover:bg-charcoal/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="text-xs text-charcoal">
                        {formatTime(claim.time)}
                      </div>
                      <a
                        href={`https://solscan.io/tx/${claim.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block mt-1"
                      >
                        {formatSignature(claim.signature)}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-charcoal text-sm">
                        {claim.amountSol.toFixed(4)} SOL
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