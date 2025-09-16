import { useState, useEffect } from 'react'

interface CountdownProps {
  nextDrawTime: number
}

export default function Countdown({ nextDrawTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const diff = nextDrawTime - now

      if (diff <= 0) {
        setTimeLeft('Drawing now!')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [nextDrawTime])

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">Next Draw In</h2>
      <div className="text-6xl font-mono font-bold text-center text-mint-600">{timeLeft}</div>
    </div>
  )
}