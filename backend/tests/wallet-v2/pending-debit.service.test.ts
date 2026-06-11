import { describe, it, expect, beforeEach, vi } from "vitest";
import { PendingDebitService } from '../../src/services/wallet-v2/pending-debit.service';

const mockQuery = vi.fn();
const mockPool = { query: mockQuery } as any;

beforeEach(() => mockQuery.mockReset());

describe('PendingDebitService', () => {
  const svc = new PendingDebitService(mockPool);

  it('create registers pending with invariant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // idempotency
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // insert
    const r = await svc.create({ rideId: 'r1', driverId: 'd1', finalPriceCents: BigInt(3000), feeAmountCents: BigInt(540), reservedCents: BigInt(540) });
    expect(r.already_processed).toBe(false);
    // fee_collected=0 + fee_pending=540 = fee_amount=540
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[1]).toContain('540'); // fee_amount and fee_pending same value
  });

  it('create idempotent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    const r = await svc.create({ rideId: 'r1', driverId: 'd1', finalPriceCents: BigInt(3000), feeAmountCents: BigInt(540), reservedCents: BigInt(540) });
    expect(r.already_processed).toBe(true);
  });

  it('resolveOnRecharge resolves when wallet has balance', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', ride_id: 'r1', fee_pending_cents: '540', driver_id: 'd1' }] });
    const mockWallet = { debitPending: vi.fn().mockResolvedValue({}) };
    const mockFeeSplit = { markCollected: vi.fn().mockResolvedValue({}) };
    mockQuery.mockResolvedValueOnce({}) // update pending
      .mockResolvedValueOnce({ rows: [{ territory_id: 't1', manager_id: 'm1', manager_share_cents: '216', reference_month: '2026-06' }] });
    const mockLedger = { recordFeeShare: vi.fn().mockResolvedValue({}) };

    const count = await svc.resolveOnRecharge('d1', mockWallet, mockFeeSplit, mockLedger);
    expect(count).toBe(1);
    expect(mockWallet.debitPending).toHaveBeenCalledWith('d1', BigInt(540), '1');
    expect(mockFeeSplit.markCollected).toHaveBeenCalledWith('r1');
    expect(mockLedger.recordFeeShare).toHaveBeenCalledWith('t1', 'm1', BigInt(216), 'r1', '2026-06');
  });

  it('resolveOnRecharge fails gracefully when insufficient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1', ride_id: 'r1', fee_pending_cents: '540', driver_id: 'd1' }] });
    const mockWallet = { debitPending: vi.fn().mockRejectedValue(new Error('INSUFFICIENT')) };
    mockQuery.mockResolvedValueOnce({}); // update attempts

    const count = await svc.resolveOnRecharge('d1', mockWallet, {} as any, {} as any);
    expect(count).toBe(0);
  });
});
