# $RAFFLE - Solana Raffle System

A livestream-friendly Solana raffle site that processes claimed Pump.fun creator fees every 20 minutes, picks 3 winners from token holders, and distributes 95% of claimed fees evenly among them (5% goes to marketing wallet).

## Features

- **Claim Processing**: Detects when you claim fees from Pump.fun to your wallet
- **Automatic Raffles**: Runs every 20 minutes if claimed fees are available
- **Fair Weighted Selection**: Uses sqrt or log algorithms for balanced odds
- **3 Winners Per Draw**: Equal distribution of 95% of claimed fees
- **Marketing Allocation**: 5% automatically sent to marketing wallet
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

## Fee Collection Flow

The system processes fees you claim from Pump.fun:

1. **Manual Claiming**: You claim creator fees on Pump.fun website to your wallet
2. **Automatic Detection**: Every 20 minutes, the system:
   - Checks `CLAIM_RECEIVER_WALLET` for new claimed fee deposits
   - Identifies transactions from Pump.fun fee claims
   - Tracks which claims have been processed
3. **Raffle Execution** (if fees available):
   - Selects 3 winners from token holders
   - 95% split evenly among winners
   - 5% sent to `MARKETING_WALLET`
4. **State Tracking**:
   - Remembers last processed claim to avoid duplicates
   - All raffles and payouts recorded in D1 database

### Important: Claiming Process
- **You must manually claim fees** on Pump.fun before each raffle
- The system detects claimed fees automatically
- If no fees are claimed, the raffle is skipped
- Claim fees regularly to keep raffles running!

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