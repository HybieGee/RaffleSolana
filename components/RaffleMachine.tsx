interface RaffleMachineProps {
  isDrawing: boolean
}

export default function RaffleMachine({ isDrawing }: RaffleMachineProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Raffle Machine</h2>
      <div className="flex justify-center items-center space-x-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-20 h-20 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ${
              isDrawing ? 'lottery-ball' : ''
            }`}
          >
            {isDrawing ? '?' : i}
          </div>
        ))}
      </div>
      {isDrawing && (
        <p className="text-center mt-6 text-mint-600 font-semibold animate-pulse">
          Drawing winners...
        </p>
      )}
    </div>
  )
}