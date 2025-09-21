import { useRef, useEffect, useState } from 'react'

interface RaffleMachineProps {
  isDrawing: boolean
}

export default function RaffleMachine({ isDrawing }: RaffleMachineProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loopCount, setLoopCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (isDrawing && videoRef.current) {
      // Reset and play the animation when drawing starts
      setLoopCount(0)
      setHasStarted(true)
      videoRef.current.currentTime = 0
      videoRef.current.play()
    } else if (!isDrawing && videoRef.current) {
      // Reset state when not drawing
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setLoopCount(0)
      setHasStarted(false)
    }
  }, [isDrawing])

  const handleVideoEnd = () => {
    if (isDrawing && loopCount < 2 && videoRef.current) {
      // Play 3 times total (0, 1, 2)
      setLoopCount(prev => prev + 1)
      videoRef.current.play()
    } else {
      // Drawing complete
      setHasStarted(false)
    }
  }

  return (
    <div className="bg-cream rounded-2xl p-6 shadow-xl h-full flex flex-col">
      <h2 className="text-xl font-bold text-center mb-4 text-charcoal">
        {isDrawing ? '🎰 DRAWING WINNERS...' : '🎯 RAFFLE MACHINE'}
      </h2>

      <div className="relative w-full h-64 flex justify-center items-center rounded-xl overflow-hidden bg-cream">
        <video
          ref={videoRef}
          className="w-auto h-full object-contain"
          muted
          playsInline
          onEnded={handleVideoEnd}
        >
          <source src="/videos/raffle-animation.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {isDrawing && hasStarted && (
        <div className="text-center mt-2">
          <p className="text-charcoal font-semibold text-lg animate-pulse">
            🎲 Selecting winner {loopCount + 1} of 3...
          </p>
        </div>
      )}

      {/* How It Works Section */}
      <div className="mt-4 pt-4 border-t border-charcoal/20">
        <h3 className="text-lg font-bold mb-3 text-charcoal">How It Works</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">Automatic raffle every 10 minutes</span>
          </li>
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">3 winners selected per draw</span>
          </li>
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">95% of creator fees split among winners</span>
          </li>
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">Hold tokens for better odds (weighted by sqrt or log)</span>
          </li>
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">Fair distribution with max 5x weight ratio</span>
          </li>
          <li className="flex items-start">
            <span className="text-charcoal mr-2">•</span>
            <span className="text-gray-700">Fully automated payouts on-chain</span>
          </li>
        </ul>
      </div>
    </div>
  )
}