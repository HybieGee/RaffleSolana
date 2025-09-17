import { useRef, useEffect, useState } from 'react'

interface RaffleMachineProps {
  isDrawing: boolean
}

export default function RaffleMachine({ isDrawing }: RaffleMachineProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loopCount, setLoopCount] = useState(0)

  useEffect(() => {
    if (isDrawing && videoRef.current) {
      // Reset and play the animation when drawing starts
      setLoopCount(0)
      videoRef.current.currentTime = 0
      videoRef.current.play()
    } else if (!isDrawing && videoRef.current) {
      // Pause at first frame when not drawing
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isDrawing])

  const handleVideoEnd = () => {
    if (isDrawing && loopCount < 2 && videoRef.current) {
      // Play 3 times total (0, 1, 2)
      setLoopCount(prev => prev + 1)
      videoRef.current.play()
    }
  }

  return (
    <div className="bg-cream rounded-2xl p-6 shadow-xl h-full flex flex-col">
      <h2 className="text-xl font-bold text-center mb-4 text-charcoal">
        {isDrawing ? '🎰 DRAWING WINNERS...' : '🎯 RAFFLE MACHINE'}
      </h2>

      <div className="relative w-full h-96 flex justify-center items-center rounded-xl overflow-hidden bg-cream">
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

      {isDrawing && (
        <div className="text-center mt-2">
          <p className="text-charcoal font-semibold text-lg animate-pulse">
            🎲 Selecting winner {loopCount + 1} of 3...
          </p>
        </div>
      )}
    </div>
  )
}