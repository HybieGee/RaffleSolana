import { describe, it, expect } from 'vitest';
import { parsePumpClaim } from '../utils/parser';

const mockEnv = {
  CREATOR_WALLET: '8NwUT5jyjPdWcjjWrqTQNwuGiRZMrS6o3pwYTE3Kjwfi',
  PUMP_PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  HELIUS_API_KEY: 'test-key',
  ALLOWED_WEBHOOK_KEY: 'test-secret'
} as any;

describe('Pump Claim Parser', () => {
  it('should parse a valid Pump.fun fee claim transaction', async () => {
    const mockTransaction = {
      signature: 'test-signature-123',
      blockTime: 1700000000,
      transaction: {
        message: {
          accountKeys: [
            '8NwUT5jyjPdWcjjWrqTQNwuGiRZMrS6o3pwYTE3Kjwfi', // Creator wallet
            '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump program
            '11111111111111111111111111111111' // System program
          ],
          instructions: [
            {
              programIdIndex: 1, // Pump program
              accounts: [0],
              data: 'claimFee' // Simplified
            }
          ]
        }
      },
      meta: {
        preBalances: [1000000000, 5000000000, 0], // 1 SOL, 5 SOL, 0
        postBalances: [2000000000, 4000000000, 0], // 2 SOL, 4 SOL, 0 (creator gained 1 SOL)
      }
    };

    const result = await parsePumpClaim(mockTransaction, mockEnv);

    expect(result).toBeDefined();
    expect(result?.signature).toBe('test-signature-123');
    expect(result?.time).toBe(1700000000);
    expect(result?.amountSol).toBe(1); // Gained 1 SOL
    expect(result?.wallet).toBe(mockEnv.CREATOR_WALLET);
  });

  it('should return null for non-Pump transactions', async () => {
    const mockTransaction = {
      signature: 'test-signature-456',
      blockTime: 1700000001,
      transaction: {
        message: {
          accountKeys: [
            '8NwUT5jyjPdWcjjWrqTQNwuGiRZMrS6o3pwYTE3Kjwfi',
            '11111111111111111111111111111111' // Only system program
          ],
          instructions: [
            {
              programIdIndex: 1,
              accounts: [0],
              data: 'transfer'
            }
          ]
        }
      },
      meta: {
        preBalances: [1000000000, 0],
        postBalances: [900000000, 100000000],
      }
    };

    const result = await parsePumpClaim(mockTransaction, mockEnv);
    expect(result).toBeNull();
  });

  it('should return null for transactions where creator loses funds', async () => {
    const mockTransaction = {
      signature: 'test-signature-789',
      blockTime: 1700000002,
      transaction: {
        message: {
          accountKeys: [
            '8NwUT5jyjPdWcjjWrqTQNwuGiRZMrS6o3pwYTE3Kjwfi',
            '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
          ],
          instructions: [
            {
              programIdIndex: 1,
              accounts: [0],
              data: 'someInstruction'
            }
          ]
        }
      },
      meta: {
        preBalances: [2000000000, 1000000000],
        postBalances: [1000000000, 2000000000], // Creator lost 1 SOL
      }
    };

    const result = await parsePumpClaim(mockTransaction, mockEnv);
    expect(result).toBeNull();
  });
});