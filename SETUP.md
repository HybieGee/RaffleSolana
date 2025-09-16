# $RAFFLE Setup Guide

## ✅ Completed Configuration

### Cloudflare Resources Created
- **D1 Database**: `raffle-db` (ID: `a0b797f9-ee8b-4302-bbc2-7af64cb84e2a`)
- **KV Namespace**: `KV_RAFFLE` (ID: `adb78fd83f524dd283a2db8868795ac1`)
- **Database Schema**: Applied with tables for draws, winners, and holders

### Generated Solana Keypair
- **Public Key**: `84m96orhzBdVqzh5dhBLPGqQV5Vys5iZUhAY6SVMc4xv`
- **Private Key**: Stored securely in `.dev.vars` (Base64 encoded)

### Environment Variables Configured
- Development variables in `.dev.vars` (Worker)
- Frontend variables in `.env.local` (Next.js)

## 🚀 Next Steps

### 1. Fund the Payout Wallet
```bash
# The payout wallet needs SOL for transaction fees
# Send at least 0.1 SOL to: 84m96orhzBdVqzh5dhBLPGqQV5Vys5iZUhAY6SVMc4xv
```

### 2. Update Token Configuration
Edit `.dev.vars` and `.env.local` to use your actual token:
```bash
TOKEN_MINT_ADDRESS=your_actual_token_mint_address
```

### 3. Configure RPC Endpoint
Update `.dev.vars` with a reliable RPC endpoint:
```bash
SOLANA_RPC_URL=https://api.helius.xyz/v0/your-api-key
# or
SOLANA_RPC_URL=https://rpc.quicknode.pro/your-endpoint
```

### 4. Test Local Development
```bash
# Terminal 1 - Start the Worker
npm run worker:dev

# Terminal 2 - Start the Frontend
npm run dev
```

### 5. Deploy to Production
```bash
# Set production secrets in Cloudflare dashboard:
wrangler secret put SOLANA_RPC_URL
wrangler secret put TOKEN_MINT_ADDRESS
wrangler secret put CREATOR_WALLET
wrangler secret put PAYOUT_SIGNER_SECRET
wrangler secret put ADMIN_TOKEN

# Deploy the worker
npm run worker:deploy
```

## 🔧 Production Configuration

### Cloudflare Dashboard Settings
1. **Worker Environment Variables**:
   - `SOLANA_RPC_URL`: Your production RPC endpoint
   - `TOKEN_MINT_ADDRESS`: Your SPL token address
   - `CREATOR_WALLET`: `84m96orhzBdVqzh5dhBLPGqQV5Vys5iZUhAY6SVMc4xv`
   - `PAYOUT_SIGNER_SECRET`: (Base64 from `.dev.vars`)
   - `ADMIN_TOKEN`: Secure random token for admin endpoints
   - `NETWORK`: `mainnet-beta`

2. **GitHub Secrets** (for CI/CD):
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Cloudflare Pages Setup
1. Connect your GitHub repository to Cloudflare Pages
2. Build settings:
   - Build command: `npm run build`
   - Output directory: `out`
3. Environment variables:
   - `NEXT_PUBLIC_TOKEN_MINT_ADDRESS`: Your token address

## 🧪 Testing

### Test API Endpoints
```bash
# Health check
curl https://raffle-worker.your-subdomain.workers.dev/health

# Current status
curl https://raffle-worker.your-subdomain.workers.dev/api/status

# Force draw (admin)
curl -X POST \
  -H "Authorization: Bearer raffle_admin_2024" \
  https://raffle-worker.your-subdomain.workers.dev/admin/force-draw
```

### Verify Database
```bash
# Check draws table
wrangler d1 execute raffle-db --command="SELECT * FROM draws ORDER BY started_at DESC LIMIT 5"

# Check winners
wrangler d1 execute raffle-db --command="SELECT * FROM winners ORDER BY id DESC LIMIT 10"
```

## 📊 Monitoring

### Worker Logs
```bash
wrangler tail raffle-worker
```

### Cron Trigger Status
Check Cloudflare dashboard → Workers → raffle-worker → Triggers

## 🔒 Security Checklist

- [x] Private keys stored only in Worker environment
- [x] `.dev.vars` and keypair files added to `.gitignore`
- [x] Admin endpoints protected with bearer token
- [x] Environment variables properly configured
- [ ] Production RPC endpoint configured
- [ ] Payout wallet funded with SOL
- [ ] GitHub secrets configured for CI/CD

## 🆘 Troubleshooting

### Common Issues
1. **"Insufficient funds"**: Fund the payout wallet with SOL
2. **"Token accounts not found"**: Verify TOKEN_MINT_ADDRESS is correct
3. **"RPC timeout"**: Use a reliable paid RPC endpoint
4. **"Cron not triggering"**: Check Cloudflare dashboard triggers

### Support Resources
- [Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Solana Web3.js Docs](https://solanacookbook.com/)