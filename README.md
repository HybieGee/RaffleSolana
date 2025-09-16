# $RAFFLE - Solana Raffle System

A livestream-friendly Solana raffle site that automatically runs every 20 minutes, picks 3 winners, and splits 95% of creator fees evenly among them.

## Features

- Automatic raffle draws every 20 minutes via Cloudflare Cron Triggers
- Fair weighted selection using sqrt or log algorithms
- 3 winners per draw with equal payouts
- 95% of fees distributed to winners, 5% to creator
- Real-time updates via Server-Sent Events (SSE)
- Responsive, stream-friendly UI optimized for 1920x1080
- Fully automated on-chain payouts
- Immutable results stored in Cloudflare D1

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
   - `TOKEN_MINT_ADDRESS`: SPL token address for weighting
   - `CREATOR_WALLET`: Wallet to receive 5% creator fee
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

## Fee Collection

The system expects creator fees to be available for distribution. You need to implement one of these strategies:

1. **Program Account Balance**: Monitor balance changes in a specific program account
2. **Transaction Webhooks**: Use Helius/QuickNode webhooks for fee transactions
3. **Manual Deposits**: Periodically deposit fees to a collection wallet

Update `getCreatorFees()` in `worker/src/services/raffle.ts` with your chosen method.

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