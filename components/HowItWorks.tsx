export default function HowItWorks() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">How It Works</h2>
      <ul className="space-y-3">
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">Automatic raffle every 20 minutes</span>
        </li>
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">3 winners selected per draw</span>
        </li>
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">95% of creator fees split among winners</span>
        </li>
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">Hold tokens for better odds (weighted by sqrt or log)</span>
        </li>
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">Fair distribution with max 5x weight ratio</span>
        </li>
        <li className="flex items-start">
          <span className="text-mint-600 mr-2">•</span>
          <span className="text-gray-700">Fully automated payouts on-chain</span>
        </li>
      </ul>
    </div>
  )
}