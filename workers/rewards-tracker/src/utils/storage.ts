import { ClaimData } from './parser';

export async function storeClaim(db: D1Database, claim: ClaimData): Promise<void> {
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO claims (id, time, amount_sol, wallet)
      VALUES (?, ?, ?, ?)
    `).bind(
      claim.signature,
      claim.time,
      claim.amountSol,
      claim.wallet
    ).run();
  } catch (error) {
    console.error('Error storing claim:', error);
    throw error;
  }
}

export async function getClaims(
  db: D1Database,
  limit: number = 100,
  before?: string
): Promise<ClaimData[]> {
  let query = `
    SELECT id as signature, time, amount_sol as amountSol, wallet
    FROM claims
  `;

  const params: any[] = [];

  if (before) {
    // If 'before' is a signature, get its timestamp first
    if (before.length > 20) {
      const beforeClaim = await db.prepare(
        'SELECT time FROM claims WHERE id = ?'
      ).bind(before).first();

      if (beforeClaim) {
        query += ' WHERE time < ?';
        params.push(beforeClaim.time);
      }
    } else {
      // Treat as timestamp
      query += ' WHERE time < ?';
      params.push(parseInt(before));
    }
  }

  query += ' ORDER BY time DESC LIMIT ?';
  params.push(limit);

  const stmt = params.length > 0
    ? db.prepare(query).bind(...params)
    : db.prepare(query);

  const result = await stmt.all();
  return result.results as unknown as ClaimData[];
}

export interface ClaimSummary {
  totalSol: number;
  count: number;
  from: number;
  to: number;
}

export async function getClaimsSummary(
  db: D1Database,
  kv: KVNamespace,
  range: '7d' | '30d' | 'all'
): Promise<ClaimSummary> {
  // Check cache first
  const cacheKey = `creatorClaims:summary:${range}`;
  const cached = await kv.get(cacheKey, 'json') as ClaimSummary | null;

  if (cached && range !== 'all') {
    // Cache for 5 minutes for non-'all' ranges
    const cacheAge = Date.now() / 1000 - cached.to;
    if (cacheAge < 300) {
      return cached;
    }
  }

  // Calculate time range
  const now = Math.floor(Date.now() / 1000);
  let fromTime = 0;

  switch (range) {
    case '7d':
      fromTime = now - (7 * 24 * 60 * 60);
      break;
    case '30d':
      fromTime = now - (30 * 24 * 60 * 60);
      break;
    case 'all':
      fromTime = 0;
      break;
  }

  // Query database
  const query = fromTime > 0
    ? `SELECT
        COALESCE(SUM(amount_sol), 0) as totalSol,
        COUNT(*) as count,
        MIN(time) as fromTime,
        MAX(time) as toTime
       FROM claims
       WHERE time >= ?`
    : `SELECT
        COALESCE(SUM(amount_sol), 0) as totalSol,
        COUNT(*) as count,
        MIN(time) as fromTime,
        MAX(time) as toTime
       FROM claims`;

  const stmt = fromTime > 0
    ? db.prepare(query).bind(fromTime)
    : db.prepare(query);

  const result = await stmt.first() as any;

  const summary: ClaimSummary = {
    totalSol: result?.totalSol || 0,
    count: result?.count || 0,
    from: result?.fromTime || fromTime,
    to: result?.toTime || now
  };

  // Cache the result
  await kv.put(cacheKey, JSON.stringify(summary), {
    expirationTtl: 300 // 5 minutes
  });

  return summary;
}