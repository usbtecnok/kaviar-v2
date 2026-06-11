import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeeSplitService } from '../../src/services/wallet-v2/fee-split.service';

const mockQuery = vi.fn();
const mockPool = { query: mockQuery } as any;

beforeEach(() => mockQuery.mockReset());

describe('FeeSplitService', () => {
  const svc = new FeeSplitService(mockPool);

  it('calculateSplit R$20 (2000 cents)', () => {
    const s = svc.calculateSplit(BigInt(2000));
    expect(s.fee_amount_cents).toBe(BigInt(360));
    expect(s.matrix_share_cents).toBe(BigInt(216));
    expect(s.manager_share_cents).toBe(BigInt(144));
  });

  it('calculateSplit R$30 (3000 cents)', () => {
    const s = svc.calculateSplit(BigInt(3000));
    expect(s.fee_amount_cents).toBe(BigInt(540));
    expect(s.matrix_share_cents).toBe(BigInt(324));
    expect(s.manager_share_cents).toBe(BigInt(216));
  });

  it('calculateSplit R$1 (100 cents)', () => {
    const s = svc.calculateSplit(BigInt(100));
    expect(s.fee_amount_cents).toBe(BigInt(18));
    expect(s.matrix_share_cents).toBe(BigInt(11));
    expect(s.manager_share_cents).toBe(BigInt(7));
  });

  it('calculateSplit invariant: matrix + manager = fee', () => {
    for (const price of [100, 500, 1000, 2000, 3000, 5000, 10000, 15000]) {
      const s = svc.calculateSplit(BigInt(price));
      expect(s.matrix_share_cents + s.manager_share_cents).toBe(s.fee_amount_cents);
    }
  });

  it('recordSplit collected', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }); // insert
    const r = await svc.recordSplit({ rideId: 'r1', driverId: 'd1', finalPriceCents: BigInt(3000), collected: true });
    expect(r.already_processed).toBe(false);
    expect(mockQuery.mock.calls[1][1]).toContain('540'); // fee_amount
  });

  it('recordSplit pending', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '2' }] });
    const r = await svc.recordSplit({ rideId: 'r2', driverId: 'd1', finalPriceCents: BigInt(2000), collected: false });
    expect(r.already_processed).toBe(false);
  });

  it('recordSplit idempotent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    const r = await svc.recordSplit({ rideId: 'r1', driverId: 'd1', finalPriceCents: BigInt(3000), collected: true });
    expect(r.already_processed).toBe(true);
  });
});
