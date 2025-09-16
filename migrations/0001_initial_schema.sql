CREATE TABLE IF NOT EXISTS draws (
  draw_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  fee_total_lamports INTEGER NOT NULL,
  odds_mode TEXT NOT NULL CHECK (odds_mode IN ('sqrt', 'log')),
  max_weight_ratio REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  version TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  probability REAL NOT NULL,
  payout_lamports INTEGER NOT NULL,
  tx_sig TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draw_id) REFERENCES draws(draw_id)
);

CREATE TABLE IF NOT EXISTS holders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  raw_balance INTEGER NOT NULL,
  weight REAL NOT NULL,
  probability REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draw_id) REFERENCES draws(draw_id)
);

CREATE INDEX idx_draws_started_at ON draws(started_at DESC);
CREATE INDEX idx_winners_draw_id ON winners(draw_id);
CREATE INDEX idx_winners_wallet ON winners(wallet);
CREATE INDEX idx_holders_draw_id ON holders(draw_id);