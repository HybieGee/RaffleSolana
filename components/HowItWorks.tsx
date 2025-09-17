export default function HowItWorks() {
  return (
    <div className="bg-cream rounded-2xl p-5 shadow-xl">
      <h2 className="text-xl font-bold mb-3 text-charcoal">How It Works</h2>
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
  )
}