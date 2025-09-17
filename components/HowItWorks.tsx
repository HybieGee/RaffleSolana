export default function HowItWorks() {
  return (
    <div className="bg-charcoal rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-cream">How It Works</h2>
      <ul className="space-y-3">
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">Automatic raffle every 20 minutes</span>
        </li>
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">3 winners selected per draw</span>
        </li>
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">95% of creator fees split among winners</span>
        </li>
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">Hold tokens for better odds (weighted by sqrt or log)</span>
        </li>
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">Fair distribution with max 5x weight ratio</span>
        </li>
        <li className="flex items-start">
          <span className="text-cream mr-2">•</span>
          <span className="text-gray-300">Fully automated payouts on-chain</span>
        </li>
      </ul>
    </div>
  )
}