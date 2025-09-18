# Pump.fun Creator Rewards Tracker

Real-time tracking of Pump.fun creator fee claims for $RAFFLE.

## Setup

### 1. Install Dependencies

```bash
cd workers/rewards-tracker
npm install
```

### 2. Create D1 Database

```bash
wrangler d1 create creator-claims
# Copy the database_id to wrangler.toml
```

### 3. Create KV Namespace

```bash
wrangler kv:namespace create KV_SUMMARY
# Copy the id to wrangler.toml
```

### 4. Apply Database Schema

```bash
wrangler d1 execute creator-claims --file=./schema.sql
```

### 5. Set Environment Secrets

```bash
# Creator wallet address (your Pump.fun creator wallet)
wrangler secret put CREATOR_WALLET

# Pump.fun program ID
wrangler secret put PUMP_PROGRAM_ID

# Helius API key for RPC and webhook
wrangler secret put HELIUS_API_KEY

# Shared secret for webhook authentication
wrangler secret put ALLOWED_WEBHOOK_KEY
```

### 6. Deploy Worker

```bash
npm run deploy
# Note the Worker URL (e.g., https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev)
```

### 7. Update Frontend Environment

Add to your `.env.local`:

```
NEXT_PUBLIC_REWARDS_WORKER_URL=https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev
```

### 8. Create Helius Webhook

Go to [Helius Dashboard](https://dashboard.helius.dev) and create an Enhanced Webhook:

```json
{
  "webhookURL": "https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev/api/hooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": ["YOUR_CREATOR_WALLET"],
  "encoding": "jsonParsed",
  "webhookType": "enhanced",
  "authHeader": "X-Webhook-Secret",
  "authKey": "YOUR_ALLOWED_WEBHOOK_KEY"
}
```

## Backfilling Historical Data

To import historical claims:

```bash
# Start from a specific signature
curl -X POST https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev/internal/reconcile?start=SIGNATURE \
  -H "X-Webhook-Secret: YOUR_SECRET"

# Or fetch last 100 transactions
curl -X POST https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev/internal/reconcile?limit=100 \
  -H "X-Webhook-Secret: YOUR_SECRET"
```

## API Endpoints

### Get Claims
```
GET /api/creator-claims?limit=20&before=SIGNATURE
```

### Get Summary
```
GET /api/creator-claims/summary?range=7d|30d|all
```

### Health Check
```
GET /api/creator-claims/health
```

## Testing

```bash
npm test
```

## Monitoring

Check Worker health:

```bash
curl https://rewards-tracker.YOUR_SUBDOMAIN.workers.dev/api/creator-claims/health
```

## Troubleshooting

### Webhook not receiving events
- Verify the webhook URL is correct
- Check the auth header matches your secret
- Ensure account addresses include your creator wallet

### Claims not showing up
- Check Worker logs: `wrangler tail`
- Verify PUMP_PROGRAM_ID is correct
- Run reconciliation to backfill missed transactions

### Parser not detecting claims
- Review transaction logs for Pump-specific patterns
- Update parser discriminators if Pump program changes
- Check that creator wallet is receiving SOL (not sending)