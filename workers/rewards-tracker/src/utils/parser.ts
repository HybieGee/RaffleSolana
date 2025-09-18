import { Env } from '../index';

export interface ClaimData {
  signature: string;
  time: number;
  amountSol: number;
  wallet: string;
}

// Pump.fun instruction discriminators (adjust based on actual program)
const PUMP_INSTRUCTIONS = {
  CLAIM_FEE: [0x4e, 0x0a, 0x5c, 0xf3], // Example, needs real discriminator
  WITHDRAW: [0xa3, 0x5f, 0xd9, 0x2f],   // Example, needs real discriminator
};

export async function parsePumpClaim(
  txData: any,
  env: Env
): Promise<ClaimData | null> {
  try {
    // Check if transaction involves the creator wallet
    const accountKeys = txData.transaction?.message?.accountKeys || [];
    const creatorIndex = accountKeys.findIndex(
      (key: any) => (typeof key === 'string' ? key : key.pubkey) === env.CREATOR_WALLET
    );

    if (creatorIndex === -1) {
      return null; // Transaction doesn't involve creator wallet
    }

    // Check for Pump program in instructions
    const instructions = [
      ...(txData.transaction?.message?.instructions || []),
      ...(txData.meta?.innerInstructions?.flatMap((inner: any) => inner.instructions) || [])
    ];

    let isPumpClaim = false;
    for (const instruction of instructions) {
      const programId = accountKeys[instruction.programIdIndex];
      const programIdStr = typeof programId === 'string' ? programId : programId?.pubkey;

      if (programIdStr === env.PUMP_PROGRAM_ID) {
        // Check instruction data for claim/withdraw discriminator
        const data = instruction.data;
        if (data && typeof data === 'string') {
          // Decode base58/base64 and check discriminator
          // For now, we'll accept any Pump instruction that credits the creator
          isPumpClaim = true;
          break;
        }
      }
    }

    if (!isPumpClaim) {
      return null;
    }

    // Calculate net lamports change for creator wallet
    const preBalance = txData.meta?.preBalances?.[creatorIndex] || 0;
    const postBalance = txData.meta?.postBalances?.[creatorIndex] || 0;
    const netChange = postBalance - preBalance;

    // Only process if creator received funds (claim/withdraw)
    if (netChange <= 0) {
      return null;
    }

    // Extract transaction details
    const signature = txData.transaction?.signatures?.[0] || txData.signature;
    const blockTime = txData.blockTime || Math.floor(Date.now() / 1000);
    const amountSol = netChange / 1e9; // Convert lamports to SOL

    return {
      signature,
      time: blockTime,
      amountSol,
      wallet: env.CREATOR_WALLET
    };
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
}

// Helper to check if transaction is a Pump fee claim
export function isPumpFeeTransaction(txData: any, env: Env): boolean {
  // Look for specific Pump.fun fee claim patterns
  // This includes checking for:
  // 1. Transfer from Pump fee account to creator
  // 2. Specific instruction patterns
  // 3. Token account changes

  const logs = txData.meta?.logMessages || [];

  // Check for Pump.fun specific log patterns
  const hasPumpLogs = logs.some((log: string) =>
    log.includes('Program log: Instruction: ClaimFee') ||
    log.includes('Program log: Instruction: WithdrawFees') ||
    log.includes('Fee claimed successfully')
  );

  if (hasPumpLogs) {
    return true;
  }

  // Alternative: Check for SOL transfer from known Pump fee accounts
  // You may need to identify and track Pump's fee collection accounts
  const knownPumpFeeAccounts = [
    'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM', // Pump fee vault (example)
    'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1', // Another fee account
  ];

  const instructions = txData.transaction?.message?.instructions || [];
  for (const inst of instructions) {
    const programId = txData.transaction?.message?.accountKeys?.[inst.programIdIndex];

    // Check for system transfer to creator
    if (programId === '11111111111111111111111111111111') { // System program
      const accounts = inst.accounts || [];
      if (accounts.length >= 2) {
        const from = txData.transaction?.message?.accountKeys?.[accounts[0]];
        const to = txData.transaction?.message?.accountKeys?.[accounts[1]];

        if (knownPumpFeeAccounts.includes(from) && to === env.CREATOR_WALLET) {
          return true;
        }
      }
    }
  }

  return false;
}