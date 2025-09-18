import { useState, useEffect } from 'react'

interface CountdownProps {
  nextDrawTime: number
}

export default function Countdown({ nextDrawTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 })

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const minutes = now.getMinutes()
      const seconds = now.getSeconds()

      // Calculate time until next 10-minute mark (:00, :10, :20, :30, :40, :50)
      let nextMinute
      if (minutes % 10 === 0) {
        nextMinute = minutes + 10
      } else {
        nextMinute = Math.ceil(minutes / 10) * 10
      }

      if (nextMinute >= 60) nextMinute = 0

      const timeUntilNext = (nextMinute === 0 ? 60 : nextMinute) * 60 - (minutes * 60 + seconds)
      const mins = Math.floor(timeUntilNext / 60)
      const secs = timeUntilNext % 60

      setTimeLeft({ minutes: mins, seconds: secs })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-cream rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-center mb-3 text-charcoal">
        🔴 LIVE RAFFLE SYSTEM
      </h2>
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold text-charcoal">
          Automatic Raffle every 10 minutes!
        </div>
        <div className="text-base text-gray-700">
          Automatic fee collection and payouts
        </div>
        <div className="flex justify-center items-center">
          <div className="animate-pulse bg-red-500 w-4 h-4 rounded-full mr-2"></div>
          <span className="text-red-600 font-semibold">
            NEXT RAFFLE: {timeLeft.minutes}:{timeLeft.seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  )
}