import { describe, it, expect, vi, beforeEach } from 'vitest';

// Ensure repository uses provided dbOverride (and does not require getDb()).
vi.mock('../../db/index.js', () => ({
  getDb: vi.fn(() => null),
}));

describe('financial-ledger.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a ledger entry using dbOverride', async () => {
    const { createLedgerEntry } = await import('../../repositories/financial-ledger.repository.js');

    const mockDb = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: 'ledger-1' }]),
        })),
      })),
    };

    const row = await createLedgerEntry(
      {
        entryType: 'SHIFT_PAYOUT_COMPLETED',
        amountCents: 1234,
        currency: 'aud',
        payoutId: 'payout-1',
      },
      mockDb as any
    );

    expect(row).toEqual({ id: 'ledger-1' });
    expect(mockDb.insert).toHaveBeenCalled();
  });
});

