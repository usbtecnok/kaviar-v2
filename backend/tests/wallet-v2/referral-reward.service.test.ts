import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReferralRewardService } from '../../src/services/wallet-v2/referral-reward.service';

const mockQuery = vi.fn();
const mockPool = { query: mockQuery } as any;

beforeEach(() => mockQuery.mockReset());

describe('ReferralRewardService', () => {
  const svc = new ReferralRewardService(mockPool);

  it('checkEligibility true when referral exists and no reward', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // no existing reward
      .mockResolvedValueOnce({ rows: [{ agent_id: 'ag1', type: 'agent' }] }); // referral found
    const r = await svc.checkEligibility('d1');
    expect(r.eligible).toBe(true);
    expect(r.referrerId).toBe('ag1');
  });

  it('checkEligibility false when already rewarded', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    const r = await svc.checkEligibility('d1');
    expect(r.eligible).toBe(false);
  });

  it('checkEligibility false when no referrer', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await svc.checkEligibility('d1');
    expect(r.eligible).toBe(false);
  });

  it('createReward creates eligible reward', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // idempotency
      .mockResolvedValueOnce({ rows: [{ id: '10' }] }); // insert
    const r = await svc.createReward({ driverId: 'd1', referrerId: 'ag1', referrerType: 'agent', rideId: 'r1' });
    expect(r.already_processed).toBe(false);
    expect(r.id).toBe(BigInt(10));
  });

  it('createReward idempotent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '10' }] });
    const r = await svc.createReward({ driverId: 'd1', referrerId: 'ag1', referrerType: 'agent', rideId: 'r1' });
    expect(r.already_processed).toBe(true);
  });
});
