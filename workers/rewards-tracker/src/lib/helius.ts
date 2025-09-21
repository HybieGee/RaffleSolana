// Helius Enhanced Transactions webhook handler
import { Env } from '../index';

export interface HeliusEvent {
  signature: string;
  timestamp: number;
  description?: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  instructions: HeliusInstruction[];
  nativeTransfers: HeliusNativeTransfer[];
  accountData: HeliusAccountData[];
  events: any;
}

export interface HeliusInstruction {
  accounts: string[];
  data: string;
  programId: string;
  innerInstructions?: HeliusInstruction[];
}

export interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: any[];
}

export interface ParsedClaim {
  sig: string;
  ts: number;
  amount_lamports: number;
  amount_sol: number;
  labels: string[];
  coin_mint: string | null;
  source: 'helius';
}

/**
 * Verify HMAC signature from Helius webhook
 */
export async function verifyHeliusSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Remove 'sha256=' prefix if present
    const receivedSignature = signature.replace(/^sha256=/, '');

    return receivedSignature === expectedHex;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Extract creator fee labels from Helius instructions
 */
function extractCreatorFeeLabels(instructions: HeliusInstruction[]): string[] {
  const labels: string[] = [];

  // This would normally come from Helius Enhanced Transactions
  // For now, we'll detect based on program ID and instruction pattern
  for (const instruction of instructions) {
    if (instruction.programId === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') {
      // Pump.fun program - check for creator fee collection patterns
      if (instruction.data) {
        // These labels would typically be provided by Helius Enhanced Transactions
        labels.push('collect_creator_fee');
      }
    }

    // Check inner instructions
    if (instruction.innerInstructions) {
      labels.push(...extractCreatorFeeLabels(instruction.innerInstructions));
    }
  }

  return [...new Set(labels)]; // Remove duplicates
}

/**
 * Calculate native SOL transfer to creator wallet
 */
function calculateCreatorTransfer(
  nativeTransfers: HeliusNativeTransfer[],
  accountData: HeliusAccountData[],
  creatorWallet: string
): number {
  let totalTransfer = 0;

  // Method 1: Check nativeTransfers
  for (const transfer of nativeTransfers) {
    if (transfer.toUserAccount === creatorWallet) {
      totalTransfer += transfer.amount;
    }
  }

  // Method 2: Check account balance changes (more reliable)
  for (const account of accountData) {
    if (account.account === creatorWallet && account.nativeBalanceChange > 0) {
      totalTransfer = Math.max(totalTransfer, account.nativeBalanceChange);
    }
  }

  return totalTransfer;
}

/**
 * Extract coin mint from Helius event
 */
function extractCoinMint(event: HeliusEvent): string | null {
  // Look for token balance changes to identify the coin mint
  for (const accountData of event.accountData) {
    if (accountData.tokenBalanceChanges && accountData.tokenBalanceChanges.length > 0) {
      for (const tokenChange of accountData.tokenBalanceChanges) {
        if (tokenChange.mint && tokenChange.mint !== 'So11111111111111111111111111111111111111112') {
          return tokenChange.mint;
        }
      }
    }
  }

  return null;
}

/**
 * Parse Helius enhanced transaction event into claim
 */
export function parseHeliusEvent(event: HeliusEvent, creatorWallet: string): ParsedClaim | null {
  try {
    // Extract creator fee labels from instructions
    const labels = extractCreatorFeeLabels(event.instructions);

    // Check if this is a creator fee collection
    const isCreatorFee = labels.some(label =>
      label.includes('collect_creator_fee') ||
      label.includes('collect_coin_creator_fee')
    );

    if (!isCreatorFee) {
      return null;
    }

    // Calculate SOL transfer to creator wallet
    const amountLamports = calculateCreatorTransfer(
      event.nativeTransfers || [],
      event.accountData || [],
      creatorWallet
    );

    // Must have positive transfer to creator wallet
    if (amountLamports <= 0) {
      return null;
    }

    // Extract coin mint if available
    const coinMint = extractCoinMint(event);

    return {
      sig: event.signature,
      ts: event.timestamp,
      amount_lamports: amountLamports,
      amount_sol: amountLamports / 1e9,
      labels,
      coin_mint: coinMint,
      source: 'helius'
    };
  } catch (error) {
    console.error('Error parsing Helius event:', error, event);
    return null;
  }
}

/**
 * Handle Helius webhook payload
 */
export async function handleHeliusWebhook(
  payload: HeliusEvent[],
  creatorWallet: string
): Promise<ParsedClaim[]> {
  const claims: ParsedClaim[] = [];

  for (const event of payload) {
    const claim = parseHeliusEvent(event, creatorWallet);
    if (claim) {
      claims.push(claim);
    }
  }

  return claims;
}

/**
 * Fetch historical transactions from Helius for backfill
 */
export async function fetchHeliusHistory(
  apiKey: string,
  walletAddress: string,
  from?: number,
  to?: number,
  cursor?: string
): Promise<{ transactions: HeliusEvent[], nextCursor?: string }> {
  const url = new URL('https://api.helius.xyz/v0/addresses/transactions');
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('address', walletAddress);
  url.searchParams.set('limit', '100');
  url.searchParams.set('commitment', 'confirmed');

  if (from) {
    url.searchParams.set('before', from.toString());
  }
  if (to) {
    url.searchParams.set('until', to.toString());
  }
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    transactions: data.transactions || [],
    nextCursor: data.nextCursor
  };
}