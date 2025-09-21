// D1 database helpers for unified claim storage
import { D1Database } from '@cloudflare/workers-types';

export interface Claim {
  sig: string;
  ts: number;
  amount_lamports: number;
  amount_sol: number;
  labels: string[];
  coin_mint: string | null;
  source: 'helius' | 'alchemy';
}

export interface ClaimTotals {
  amount_lamports: number;
  amount_sol: number;
  count: number;
}

export interface DailyTotals {
  date: string;
  amount_sol: number;
  count: number;
}

/**
 * Upsert a claim into D1 (idempotent by signature)
 */
export async function upsertClaim(db: D1Database, claim: Claim): Promise<boolean> {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO claims (
        sig, ts, amount_lamports, amount_sol, labels, coin_mint, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.bind(
      claim.sig,
      claim.ts,
      claim.amount_lamports,
      claim.amount_sol,
      JSON.stringify(claim.labels),
      claim.coin_mint,
      claim.source,
      Math.floor(Date.now() / 1000)
    ).run();

    return result.success;
  } catch (error) {
    console.error('Error upserting claim:', error);
    return false;
  }
}

/**
 * Batch upsert multiple claims
 */
export async function batchUpsertClaims(db: D1Database, claims: Claim[]): Promise<number> {
  if (claims.length === 0) return 0;

  let successCount = 0;

  try {
    // Use batch for better performance
    const statements = claims.map(claim => {
      return db.prepare(`
        INSERT OR REPLACE INTO claims (
          sig, ts, amount_lamports, amount_sol, labels, coin_mint, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        claim.sig,
        claim.ts,
        claim.amount_lamports,
        claim.amount_sol,
        JSON.stringify(claim.labels),
        claim.coin_mint,
        claim.source,
        Math.floor(Date.now() / 1000)
      );
    });

    const results = await db.batch(statements);

    for (const result of results) {
      if (result.success) {
        successCount++;
      }
    }

    console.log(`Batch upserted ${successCount}/${claims.length} claims`);
  } catch (error) {
    console.error('Error batch upserting claims:', error);

    // Fallback to individual inserts
    for (const claim of claims) {
      const success = await upsertClaim(db, claim);
      if (success) successCount++;
    }
  }

  return successCount;
}

/**
 * Get recent claims
 */
export async function getRecentClaims(
  db: D1Database,
  limit: number = 50
): Promise<Claim[]> {
  try {
    const stmt = db.prepare(`
      SELECT sig, ts, amount_lamports, amount_sol, labels, coin_mint, source
      FROM claims
      ORDER BY ts DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();

    if (!result.success) {
      throw new Error('Failed to fetch recent claims');
    }

    return result.results.map(row => ({
      sig: row.sig as string,
      ts: row.ts as number,
      amount_lamports: row.amount_lamports as number,
      amount_sol: row.amount_sol as number,
      labels: JSON.parse(row.labels as string) || [],
      coin_mint: row.coin_mint as string | null,
      source: row.source as 'helius' | 'alchemy'
    }));
  } catch (error) {
    console.error('Error fetching recent claims:', error);
    return [];
  }
}

/**
 * Get all-time totals
 */
export async function getAllTimeTotals(db: D1Database): Promise<ClaimTotals> {
  try {
    const stmt = db.prepare(`
      SELECT
        COALESCE(SUM(amount_lamports), 0) as amount_lamports,
        COALESCE(SUM(amount_sol), 0) as amount_sol,
        COUNT(*) as count
      FROM claims
    `);

    const result = await stmt.first();

    if (!result) {
      return { amount_lamports: 0, amount_sol: 0, count: 0 };
    }

    return {
      amount_lamports: result.amount_lamports as number,
      amount_sol: result.amount_sol as number,
      count: result.count as number
    };
  } catch (error) {
    console.error('Error fetching all-time totals:', error);
    return { amount_lamports: 0, amount_sol: 0, count: 0 };
  }
}

/**
 * Get daily totals for the last N days (Australia/Brisbane timezone)
 */
export async function getDailyTotals(
  db: D1Database,
  days: number = 60,
  timezone: string = 'Australia/Brisbane'
): Promise<DailyTotals[]> {
  try {
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    const stmt = db.prepare(`
      SELECT
        DATE(ts, 'unixepoch') as date,
        COALESCE(SUM(amount_sol), 0) as amount_sol,
        COUNT(*) as count
      FROM claims
      WHERE ts >= ?
      GROUP BY DATE(ts, 'unixepoch')
      ORDER BY date DESC
    `);

    const result = await stmt.bind(Math.floor(startDate.getTime() / 1000)).all();

    if (!result.success) {
      throw new Error('Failed to fetch daily totals');
    }

    // Create a map of existing data
    const dataMap = new Map<string, DailyTotals>();
    for (const row of result.results) {
      dataMap.set(row.date as string, {
        date: row.date as string,
        amount_sol: row.amount_sol as number,
        count: row.count as number
      });
    }

    // Fill in missing days with zeros
    const dailyTotals: DailyTotals[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];

      dailyTotals.push(
        dataMap.get(dateStr) || {
          date: dateStr,
          amount_sol: 0,
          count: 0
        }
      );
    }

    return dailyTotals;
  } catch (error) {
    console.error('Error fetching daily totals:', error);
    return [];
  }
}

/**
 * Check if a claim exists by signature
 */
export async function claimExists(db: D1Database, signature: string): Promise<boolean> {
  try {
    const stmt = db.prepare('SELECT 1 FROM claims WHERE sig = ? LIMIT 1');
    const result = await stmt.bind(signature).first();
    return !!result;
  } catch (error) {
    console.error('Error checking claim existence:', error);
    return false;
  }
}

/**
 * Get claim by signature
 */
export async function getClaimBySignature(db: D1Database, signature: string): Promise<Claim | null> {
  try {
    const stmt = db.prepare(`
      SELECT sig, ts, amount_lamports, amount_sol, labels, coin_mint, source
      FROM claims
      WHERE sig = ?
    `);

    const result = await stmt.bind(signature).first();

    if (!result) {
      return null;
    }

    return {
      sig: result.sig as string,
      ts: result.ts as number,
      amount_lamports: result.amount_lamports as number,
      amount_sol: result.amount_sol as number,
      labels: JSON.parse(result.labels as string) || [],
      coin_mint: result.coin_mint as string | null,
      source: result.source as 'helius' | 'alchemy'
    };
  } catch (error) {
    console.error('Error fetching claim by signature:', error);
    return null;
  }
}

/**
 * Get claims in a time range
 */
export async function getClaimsInRange(
  db: D1Database,
  fromTs: number,
  toTs: number,
  limit: number = 1000
): Promise<Claim[]> {
  try {
    const stmt = db.prepare(`
      SELECT sig, ts, amount_lamports, amount_sol, labels, coin_mint, source
      FROM claims
      WHERE ts >= ? AND ts <= ?
      ORDER BY ts DESC
      LIMIT ?
    `);

    const result = await stmt.bind(fromTs, toTs, limit).all();

    if (!result.success) {
      throw new Error('Failed to fetch claims in range');
    }

    return result.results.map(row => ({
      sig: row.sig as string,
      ts: row.ts as number,
      amount_lamports: row.amount_lamports as number,
      amount_sol: row.amount_sol as number,
      labels: JSON.parse(row.labels as string) || [],
      coin_mint: row.coin_mint as string | null,
      source: row.source as 'helius' | 'alchemy'
    }));
  } catch (error) {
    console.error('Error fetching claims in range:', error);
    return [];
  }
}