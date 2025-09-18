-- Creator claims table for tracking Pump.fun rewards
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,           -- Transaction signature
  time INTEGER NOT NULL,         -- Unix timestamp (blockTime)
  amount_sol REAL NOT NULL,      -- Amount in SOL
  wallet TEXT NOT NULL,          -- Creator wallet address
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_claims_time ON claims(time DESC);

-- Index for wallet queries
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON claims(wallet, time DESC);