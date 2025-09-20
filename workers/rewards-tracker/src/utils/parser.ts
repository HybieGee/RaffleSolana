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
    // Look for collect_creator_fee transactions
    const logs = txData.meta?.logMessages || [];

    // Check if this is a collect_creator_fee transaction
    const isCreatorFee = logs.some((log: string) =>
      log.toLowerCase().includes('collect_creator_fee') ||
      log.toLowerCase().includes('get_fees') ||
      log.toLowerCase().includes('collectcreatorfee')
    );

    if (!isCreatorFee) {
      return null;
    }

    // Get account keys
    let accountKeys: string[] = [];
    if (txData.transaction?.message?.accountKeys) {
      accountKeys = txData.transaction.message.accountKeys.map((key: any) =>
        typeof key === 'string' ? key : key.pubkey
      );
    }

    // Find if transaction involves creator wallet
    const creatorIndex = accountKeys.findIndex(key =>
      key === env.CREATOR_WALLET || (key as any)?.pubkey === env.CREATOR_WALLET
    );

    if (creatorIndex < 0) {
      return null; // Creator wallet not involved
    }

    // Check balance change for creator wallet
    const preBalance = txData.meta?.preBalances?.[creatorIndex] || 0;
    const postBalance = txData.meta?.postBalances?.[creatorIndex] || 0;
    const balanceChange = postBalance - preBalance;

    // If creator wallet balance increased, it's a fee claim TO them
    if (balanceChange > 0) {
      const signature = txData.signature || txData.transaction?.signatures?.[0];
      const blockTime = txData.blockTime || Math.floor(Date.now() / 1000);
      const amountSol = balanceChange / 1e9;

      console.log(`✅ Found creator fee claim: ${signature} - ${amountSol} SOL`);

      return {
        signature,
        time: blockTime,
        amountSol,
        wallet: env.CREATOR_WALLET
      };
    }

    return null;
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