// Pump.fun instruction decoder for creator fee collection

// Pump.fun program ID
export const PUMP_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Known instruction discriminators for pump.fun
const INSTRUCTION_DISCRIMINATORS = {
  // Creator fee collection instructions
  COLLECT_CREATOR_FEE: new Uint8Array([132, 255, 1, 14, 175, 12, 175, 250]), // First 8 bytes of creator fee collect
  COLLECT_COIN_CREATOR_FEE: new Uint8Array([77, 110, 103, 39, 95, 109, 79, 42]), // Coin creator fee collect
};

export interface PumpInstruction {
  programId: string;
  type: 'collect_creator_fee' | 'collect_coin_creator_fee' | 'unknown';
  data: Uint8Array;
}

/**
 * Base58 decoder for Cloudflare Workers
 */
function base58Decode(str: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = alphabet.length;

  let bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid base58 character');
    }

    for (let j = 0; j < bytes.length; j++) {
      bytes[j] *= base;
    }
    bytes[0] += value;

    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }

    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Remove leading zeros
  while (bytes.length > 1 && bytes[bytes.length - 1] === 0) {
    bytes.pop();
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Compare two Uint8Arrays for equality
 */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Decode a pump.fun instruction from raw transaction data
 */
export function decodePumpInstruction(instruction: any): PumpInstruction | null {
  if (!instruction.programId || instruction.programId !== PUMP_PROGRAM_ID) {
    return null;
  }

  let data: Uint8Array;

  // Handle different data formats
  if (typeof instruction.data === 'string') {
    try {
      data = base58Decode(instruction.data);
    } catch (e) {
      try {
        // Try base64 decode
        const binaryString = atob(instruction.data);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
      } catch (e2) {
        return null;
      }
    }
  } else if (instruction.data instanceof Uint8Array) {
    data = instruction.data;
  } else if (Array.isArray(instruction.data)) {
    data = new Uint8Array(instruction.data);
  } else {
    return null;
  }

  // Check discriminators (first 8 bytes)
  if (data.length < 8) {
    return {
      programId: instruction.programId,
      type: 'unknown',
      data
    };
  }

  const discriminator = data.slice(0, 8);

  if (arraysEqual(discriminator, INSTRUCTION_DISCRIMINATORS.COLLECT_CREATOR_FEE)) {
    return {
      programId: instruction.programId,
      type: 'collect_creator_fee',
      data
    };
  }

  if (arraysEqual(discriminator, INSTRUCTION_DISCRIMINATORS.COLLECT_COIN_CREATOR_FEE)) {
    return {
      programId: instruction.programId,
      type: 'collect_coin_creator_fee',
      data
    };
  }

  return {
    programId: instruction.programId,
    type: 'unknown',
    data
  };
}

/**
 * Check if a transaction contains creator fee collection instructions
 */
export function hasCreatorFeeInstruction(transaction: any): boolean {
  const instructions = transaction.transaction?.message?.instructions || [];

  for (const instruction of instructions) {
    const decoded = decodePumpInstruction(instruction);
    if (decoded && (decoded.type === 'collect_creator_fee' || decoded.type === 'collect_coin_creator_fee')) {
      return true;
    }
  }

  // Also check inner instructions
  const innerInstructions = transaction.meta?.innerInstructions || [];
  for (const innerGroup of innerInstructions) {
    for (const instruction of innerGroup.instructions || []) {
      const decoded = decodePumpInstruction(instruction);
      if (decoded && (decoded.type === 'collect_creator_fee' || decoded.type === 'collect_coin_creator_fee')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate SOL balance change for a specific wallet in a transaction
 */
export function calculateBalanceChange(transaction: any, walletAddress: string): number {
  const accountKeys = transaction.transaction?.message?.accountKeys || [];
  const preBalances = transaction.meta?.preBalances || [];
  const postBalances = transaction.meta?.postBalances || [];

  // Find wallet index
  let walletIndex = -1;
  for (let i = 0; i < accountKeys.length; i++) {
    const key = accountKeys[i];
    const address = typeof key === 'string' ? key : key.pubkey;
    if (address === walletAddress) {
      walletIndex = i;
      break;
    }
  }

  if (walletIndex === -1 || walletIndex >= preBalances.length || walletIndex >= postBalances.length) {
    return 0;
  }

  const preBalance = preBalances[walletIndex] || 0;
  const postBalance = postBalances[walletIndex] || 0;

  return postBalance - preBalance; // Returns lamports
}

/**
 * Extract coin mint from pump.fun transaction (if available)
 */
export function extractCoinMint(transaction: any): string | null {
  // Look for token accounts or mints in the transaction
  const tokenBalances = transaction.meta?.postTokenBalances || [];

  for (const tokenBalance of tokenBalances) {
    if (tokenBalance.mint && tokenBalance.mint !== 'So11111111111111111111111111111111111111112') {
      return tokenBalance.mint;
    }
  }

  return null;
}