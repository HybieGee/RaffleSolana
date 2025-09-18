#!/bin/bash

echo "🚀 Setting up Pump.fun Creator Rewards Tracker"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create D1 Database
echo ""
echo "💾 Creating D1 database..."
wrangler d1 create creator-claims
echo "✅ Please copy the database_id to wrangler.toml"
echo ""
read -p "Press enter when you've updated wrangler.toml..."

# Create KV Namespace
echo ""
echo "🗂️ Creating KV namespace..."
wrangler kv:namespace create KV_SUMMARY
echo "✅ Please copy the namespace id to wrangler.toml"
echo ""
read -p "Press enter when you've updated wrangler.toml..."

# Apply schema
echo ""
echo "📋 Applying database schema..."
wrangler d1 execute creator-claims --file=./schema.sql

# Set secrets
echo ""
echo "🔐 Setting up secrets..."
echo ""

echo "Enter your creator wallet address:"
read CREATOR_WALLET
wrangler secret put CREATOR_WALLET <<< "$CREATOR_WALLET"

echo ""
echo "Enter the Pump.fun program ID (default: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P):"
read PUMP_PROGRAM_ID
if [ -z "$PUMP_PROGRAM_ID" ]; then
    PUMP_PROGRAM_ID="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
fi
wrangler secret put PUMP_PROGRAM_ID <<< "$PUMP_PROGRAM_ID"

echo ""
echo "Enter your Helius API key:"
read -s HELIUS_API_KEY
wrangler secret put HELIUS_API_KEY <<< "$HELIUS_API_KEY"

echo ""
echo "Enter a webhook secret (random string for authentication):"
read -s ALLOWED_WEBHOOK_KEY
wrangler secret put ALLOWED_WEBHOOK_KEY <<< "$ALLOWED_WEBHOOK_KEY"

# Deploy
echo ""
echo "🚀 Deploying Worker..."
npm run deploy

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Note your Worker URL from the deployment output"
echo "2. Add NEXT_PUBLIC_REWARDS_WORKER_URL to your .env.local"
echo "3. Create a Helius webhook at https://dashboard.helius.dev"
echo "4. Run reconciliation to backfill historical data"