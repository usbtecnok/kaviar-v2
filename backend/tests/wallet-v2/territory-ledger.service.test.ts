import { describe, it, expect, beforeEach, vi } from "vitest";
import { TerritoryLedgerService } from '../../src/services/wallet-v2/territory-ledger.service';

const mockQuery = vi.fn();
const mockPool = { query: mockQuery } as any;

beforeEach(() => mockQuery.mockReset());

describe('TerritoryLedgerService', () => {
  const svc = new TerritoryLedgerService(mockPool);

  it('recordFeeShare inserts positive amount', async () => {
    mockQuery.mockResolvedValue({});
    await svc.recordFeeShare('t1', 'm1', BigInt(216), 'ride-1', '2026-06');
    expect(mockQuery.mock.calls[0][1]).toContain('216');
    expect(mockQuery.mock.calls[0][1]).toContain('territory_fee_share:ride-1');
  });

  it('recordReferralCost inserts negative amount', async () => {
    mockQuery.mockResolvedValue({});
    await svc.recordReferralCost('t1', 'm1', BigInt(1000), 'rw-1', '2026-06');
    expect(mockQuery.mock.calls[0][1]).toContain('-1000');
  });

  it('recordFamilyReturnCost inserts negative', async () => {
    mockQuery.mockResolvedValue({});
    await svc.recordFamilyReturnCost('t1', 'm1', BigInt(500), 'fr-1', '2026-06');
    expect(mockQuery.mock.calls[0][1]).toContain('-500');
  });

  it('getMonthSummary aggregates correctly', async () => {
    mockQuery.mockResolvedValue({ rows: [
      { entry_type: 'fee_share', total: '6480' },
      { entry_type: 'referral_cost', total: '-50' },
      { entry_type: 'family_return_cost', total: '-810' },
    ]});
    const s = await svc.getMonthSummary('t1', '2026-06');
    expect(s.gross_cents).toBe(BigInt(6480));
    expect(s.referral_costs_cents).toBe(BigInt(-50));
    expect(s.family_return_costs_cents).toBe(BigInt(-810));
    expect(s.net_cents).toBe(BigInt(5620));
  });

  it('idempotent via ON CONFLICT DO NOTHING', async () => {
    mockQuery.mockResolvedValue({});
    await svc.recordFeeShare('t1', 'm1', BigInt(216), 'ride-1', '2026-06');
    expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT');
  });
});
