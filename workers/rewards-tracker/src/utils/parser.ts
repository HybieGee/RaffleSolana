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
    // Simple approach: Check if this transaction increases the creator wallet balance
    // and involves the Pump.fun program
    const pumpProgramId = env.PUMP_PROGRAM_ID || '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

    // Get account keys - handle both parsed and non-parsed formats
    let accountKeys: string[] = [];
    let creatorWalletIndex = -1;

    // Handle parsed format
    if (txData.transaction?.message?.accountKeys) {
      if (Array.isArray(txData.transaction.message.accountKeys)) {
        accountKeys = txData.transaction.message.accountKeys;
      } else if (txData.transaction.message.accountKeys.length !== undefined) {
        // Convert account keys object to array
        accountKeys = txData.transaction.message.accountKeys.map((key: any) =>
          typeof key === 'string' ? key : key.pubkey
        );
      }
    }

    // Find creator wallet index
    creatorWalletIndex = accountKeys.findIndex(key =>
      key === env.CREATOR_WALLET || (key as any)?.pubkey === env.CREATOR_WALLET
    );

    // Check if creator wallet balance increased (most reliable method)
    if (creatorWalletIndex >= 0) {
      const preBalance = txData.meta?.preBalances?.[creatorWalletIndex] || 0;
      const postBalance = txData.meta?.postBalances?.[creatorWalletIndex] || 0;
      const balanceChange = postBalance - preBalance;

      // Check if Pump.fun is involved
      const hasPumpProgram = accountKeys.some(key =>
        key === pumpProgramId || (key as any)?.pubkey === pumpProgramId
      );

      // If balance increased and Pump.fun is involved, it's a claim
      if (balanceChange > 0 && hasPumpProgram) {
        const signature = txData.signature || txData.transaction?.signatures?.[0];
        const blockTime = txData.blockTime || Math.floor(Date.now() / 1000);
        const amountSol = balanceChange / 1e9;

        console.log(`✅ Found Pump.fun claim: ${signature} - ${amountSol} SOL`);

        return {
          signature,
          time: blockTime,
          amountSol,
          wallet: env.CREATOR_WALLET
        };
      }
    }

    // Fallback: Look for any SOL increase to creator wallet in this transaction
    if (creatorWalletIndex >= 0) {
      const preBalance = txData.meta?.preBalances?.[creatorWalletIndex] || 0;
      const postBalance = txData.meta?.postBalances?.[creatorWalletIndex] || 0;
      const balanceChange = postBalance - preBalance;

      // If significant balance increase (more than 0.0001 SOL), consider it a potential claim
      if (balanceChange > 100000) { // 0.0001 SOL in lamports
        const signature = txData.signature || txData.transaction?.signatures?.[0];
        const blockTime = txData.blockTime || Math.floor(Date.now() / 1000);
        const amountSol = balanceChange / 1e9;

        console.log(`✅ Found potential claim (balance increase): ${signature} - ${amountSol} SOL`);

        return {
          signature,
          time: blockTime,
          amountSol,
          wallet: env.CREATOR_WALLET
        };
      }
    }

    return null;

    // Extract transaction details
    const signature = txData.transaction?.signatures?.[0] || txData.signature;
    const blockTime = txData.blockTime || Math.floor(Date.now() / 1000);
    const amountSol = transferAmount / 1e9; // Convert lamports to SOL

    console.log(`Found valid Pump.fun fee claim: ${signature} - ${amountSol} SOL`);

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