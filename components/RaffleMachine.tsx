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

      <div className="relative w-full h-80 flex justify-center items-center">
        {isDrawing ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain rounded-xl"
            muted
            playsInline
          >
            <source src="/videos/raffle-animation.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg"
              >
                {i}
              </div>
            ))}
          </div>
        )}
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