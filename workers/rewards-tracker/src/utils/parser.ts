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
    // Check if this is a transaction FROM the source wallet TO the creator wallet
    const logs = txData.meta?.logMessages || [];
    const hasCollectCreatorFee = logs.some((log: string) =>
      log.includes('Program log: Instruction: CollectCreatorFee')
    );

    if (!hasCollectCreatorFee) {
      return null;
    }

    // Look for the SOL transfer in inner instructions
    const innerInstructions = txData.meta?.innerInstructions || [];
    let transferAmount = 0;
    let isValidTransfer = false;

    for (const inner of innerInstructions) {
      for (const instruction of inner.instructions) {
        if (instruction.parsed?.type === 'transfer') {
          const transfer = instruction.parsed.info;
          const sourceWallet = env.PUMP_FEE_SOURCE_WALLET || 'GxXdDDuP52RrbN9dXqqiPA8npxH48thqMwij4YBrkwPU';

          // Check if transfer is from source wallet to creator wallet
          if (transfer.source === sourceWallet && transfer.destination === env.CREATOR_WALLET) {
            transferAmount = transfer.lamports;
            isValidTransfer = true;
            break;
          }
        }
      }
      if (isValidTransfer) break;
    }

    if (!isValidTransfer || transferAmount <= 0) {
      return null;
    }

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