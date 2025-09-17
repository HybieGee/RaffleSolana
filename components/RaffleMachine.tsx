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
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {isDrawing ? '🎰 DRAWING WINNERS...' : '🎯 RAFFLE MACHINE'}
      </h2>

      <div className="relative w-full h-80 flex justify-center items-center bg-gray-100 rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          muted
          playsInline
          onEnded={handleVideoEnd}
        >
          <source src="/videos/raffle-animation.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {isDrawing && (
        <div className="text-center mt-6">
          <p className="text-mint-600 font-semibold text-xl animate-pulse">
            🎲 Selecting winner {loopCount + 1} of 3...
          </p>
        </div>
      )}

      {!isDrawing && (
        <p className="text-center mt-6 text-gray-600">
          Waiting for fee claim to trigger raffle...
        </p>
      )}
    </div>
  )
}