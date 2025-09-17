import { useRef, useEffect } from 'react'

interface RaffleMachineProps {
  isDrawing: boolean
}

export default function RaffleMachine({ isDrawing }: RaffleMachineProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isDrawing && videoRef.current) {
      // Reset and play the animation when drawing starts
      videoRef.current.currentTime = 0
      videoRef.current.play()
    }
  }, [isDrawing])

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {isDrawing ? '🎰 DRAWING WINNERS...' : '🎯 RAFFLE MACHINE'}
      </h2>

      <div className="relative w-full h-80 flex justify-center items-center bg-gray-100 rounded-xl">
        <video
          ref={videoRef}
          className="w-full h-full object-contain rounded-xl"
          muted
          playsInline
          poster="/videos/raffle-animation.mp4"
          style={{ display: isDrawing ? 'block' : 'block' }}
        >
          <source src="/videos/raffle-animation.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {isDrawing && (
        <p className="text-center mt-6 text-mint-600 font-semibold text-xl animate-pulse">
          🎲 Selecting 3 winners from token holders...
        </p>
      )}

      {!isDrawing && (
        <p className="text-center mt-6 text-gray-600">
          Waiting for fee claim to trigger raffle...
        </p>
      )}
    </div>
  )
}