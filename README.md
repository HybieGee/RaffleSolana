# $RAFFLE - Live Solana Raffle System

A livestream-optimized Solana raffle that instantly triggers when you claim Pump.fun creator fees. Perfect for live streaming - viewers see the claim detection, raffle draw, and payouts in real-time!

## Features

- **🎯 Instant Claim Detection**: Detects when you claim fees on Pump.fun
- **🎰 Immediate Raffle**: Raffle starts instantly upon claim detection
- **📺 Live Stream Ready**: Visual alerts and animations for streaming
- **💰 Full Amount Distribution**: 95% of claimed amount split among 3 winners
- **🎪 Exciting Visuals**: Animated raffle machine and claim notifications
- **⚡ Real-time Updates**: Live winner announcements and payout tracking
- **📊 Marketing Share**: 5% automatically sent to marketing wallet
- **Real-time Updates**: Server-Sent Events (SSE) for live streaming
- **Stream-Optimized UI**: Responsive design for 1920x1080 capture
- **Fully Automated**: On-chain payouts with no manual intervention
- **Immutable Records**: All results stored permanently in Cloudflare D1

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS
- **Backend**: Cloudflare Workers with TypeScript
- **Database**: Cloudflare D1 (SQLite) for draw results
- **Cache**: Cloudflare KV for state management
- **Blockchain**: Solana Web3.js, SPL Token
- **Deployment**: Cloudflare Pages (frontend) + Workers (backend)

## Setup

### Prerequisites

- Node.js 20+
- Cloudflare account
- Solana RPC endpoint (Helius, Triton, or QuickNode)
- Wrangler CLI installed globally: `npm install -g wrangler`

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/HybieGee/RaffleSolana.git
cd RaffleSolana
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` with:
   - `SOLANA_RPC_URL`: Your Solana RPC endpoint
   - `TOKEN_MINT_ADDRESS`: SPL token address for holder weighting
   - `CLAIM_RECEIVER_WALLET`: Your wallet where you claim fees TO from Pump.fun
   - `MARKETING_WALLET`: Wallet to receive 5% for marketing
   - `PAYOUT_SIGNER_SECRET`: Base64 encoded secret key for payouts
   - `NETWORK`: mainnet-beta or devnet
   - `ADMIN_TOKEN`: Secret token for admin endpoints

5. Create Cloudflare resources:
```bash
wrangler kv:namespace create KV_RAFFLE
wrangler d1 create raffle-db
```

6. Update `wrangler.toml` with the IDs from the previous commands

7. Run database migrations:
```bash
wrangler d1 migrations apply raffle-db
```

8. Start development servers:
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Worker
npm run worker:dev
```

## Configuration

### Raffle Settings

Configure in `wrangler.toml` or environment variables:

- `ODDS_MODE`: `sqrt` or `log` - Algorithm for weight calculation
- `MAX_WEIGHT_RATIO`: Maximum advantage ratio (default: 5)
- `MIN_BALANCE_FOR_ELIGIBILITY`: Minimum token balance to participate

### Weight Calculation

**Square Root Mode**: `weight = sqrt(balance)`
- More balanced distribution
- Smaller holders have better relative odds

**Logarithmic Mode**: `weight = 1 + log10(1 + balance)`
- Even more compressed distribution
- Minimizes whale advantage

Both modes include:
- Soft cap limiting max advantage to `MAX_WEIGHT_RATIO`
- Floor weight ensuring all holders have a chance

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /api/status` - Current raffle status and next draw time
- `GET /api/winners?limit=N` - Recent winners
- `GET /api/odds?wallet=ADDRESS` - Calculate odds for a wallet
- `GET /stream` - Server-sent events for real-time updates

### Admin Endpoints (requires Authorization header)

- `POST /admin/force-draw` - Manually trigger a raffle draw
- `POST /admin/retry-payout?draw_id=ID` - Retry failed payouts

## Deployment

### GitHub Actions

The repository includes automated deployment via GitHub Actions:

1. Add secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. Push to main branch to trigger deployment

### Manual Deployment

```bash
# Build frontend
npm run build

# Deploy Worker
npm run worker:deploy

# Run migrations
npm run db:migrate
```

### Cloudflare Pages Setup

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `out`
4. Configure environment variables in Cloudflare dashboard

## Monitoring

### Viewing Logs

```bash
wrangler tail raffle-worker
```

### Database Queries

```bash
# View recent draws
wrangler d1 execute raffle-db --command="SELECT * FROM draws ORDER BY started_at DESC LIMIT 10"

# View winners
wrangler d1 execute raffle-db --command="SELECT * FROM winners ORDER BY id DESC LIMIT 10"
```

## Live Streaming Flow

Perfect for engaging live streams:

### How It Works

1. **You Claim Fees on Pump.fun** (while streaming)
2. **System Instantly Detects** the claim transaction
3. **Live Alert Shows** on screen: "🎯 CLAIM DETECTED: X.XX SOL"
4. **Raffle Begins Immediately** with animated lottery balls
5. **3 Winners Selected** from token holders (weighted by balance)
6. **Instant Payouts**: 95% split to winners, 5% to marketing
7. **Results Display** with transaction links

### Live Stream Experience

```
[STREAM VIEW]
────────────────────────────────────
Host: "Let me claim these Pump.fun fees..."
*Claims 2 SOL on Pump.fun*

🎯 CLAIM DETECTED: 2.000 SOL (Big yellow alert)
"Raffle starting NOW!"

🎰 Lottery balls animate...

WINNERS ANNOUNCED:
🥇 Wallet1: 0.633 SOL
🥈 Wallet2: 0.633 SOL
🥉 Wallet3: 0.633 SOL

Payouts sent! View on Solscan →
────────────────────────────────────
```

### Perfect for Streaming Because:
- **Instant Action**: No waiting for scheduled draws
- **Visual Excitement**: Claim alerts and animations
- **Viewer Engagement**: They see everything happen live
- **Transparent**: All transactions verifiable on-chain

## Fairness

The raffle ensures fairness through:

1. **Transparent Weighting**: All calculations are deterministic and verifiable
2. **No Replacement Selection**: Winners can't win multiple times in same draw
3. **Immutable Results**: All draws stored permanently in D1
4. **Public Odds API**: Anyone can verify their probability
5. **Maximum Weight Ratio**: Limits whale advantage to configurable ratio

## Security

- Private keys stored only in Worker environment
- Idempotent payouts prevent double-spending
- Draw locks prevent concurrent executions
- Admin endpoints protected by bearer token
- All sensitive operations logged for audit

## Troubleshooting

### Common Issues

1. **Raffle not running**: Check cron trigger in Cloudflare dashboard
2. **Payouts failing**: Verify signer wallet has sufficient SOL
3. **No holders found**: Check TOKEN_MINT_ADDRESS and RPC endpoint
4. **SSE not updating**: Ensure CORS headers are configured

### Support

For issues or questions:
- Open an issue on GitHub
- Check Worker logs via `wrangler tail`
- Verify D1 data via SQL queries

## License

MIT