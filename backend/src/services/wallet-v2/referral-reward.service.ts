import { Pool } from 'pg';

export class ReferralRewardService {
  constructor(private pool: Pool) {}

  async checkEligibility(driverId: string): Promise<{ eligible: boolean; referrerId?: string; referrerType?: string }> {
    const existing = await this.pool.query('SELECT id FROM driver_referral_rewards WHERE driver_id = $1', [driverId]);
    if (existing.rows[0]) return { eligible: false };

    const referral = await this.pool.query(
      "SELECT agent_id, 'agent' as type FROM referrals WHERE driver_id = $1 AND status = 'qualified' LIMIT 1",
      [driverId]
    );
    if (!referral.rows[0]) return { eligible: false };
    return { eligible: true, referrerId: referral.rows[0].agent_id, referrerType: referral.rows[0].type };
  }

  async createReward(params: { driverId: string; referrerId: string; referrerType: string; rideId: string; territoryId?: string; managerId?: string }): Promise<{ id: bigint; already_processed: boolean }> {
    const key = `driver_referral_reward:${params.driverId}`;
    const existing = await this.pool.query('SELECT id FROM driver_referral_rewards WHERE idempotency_key = $1', [key]);
    if (existing.rows[0]) return { id: BigInt(existing.rows[0].id), already_processed: true };

    const r = await this.pool.query(
      `INSERT INTO driver_referral_rewards (driver_id, referrer_id, referrer_type, first_valid_ride_id, total_reward_cents, matrix_cost_cents, manager_cost_cents, territory_id, manager_id, status, idempotency_key)
       VALUES ($1,$2,$3,$4,2000,1000,1000,$5,$6,'eligible',$7) RETURNING id`,
      [params.driverId, params.referrerId, params.referrerType, params.rideId, params.territoryId || null, params.managerId || null, key]
    );
    return { id: BigInt(r.rows[0].id), already_processed: false };
  }

  async approveReward(rewardId: bigint): Promise<void> {
    await this.pool.query(
      "UPDATE driver_referral_rewards SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'eligible'",
      [rewardId.toString()]
    );

    const reward = await this.pool.query('SELECT * FROM driver_referral_rewards WHERE id = $1', [rewardId.toString()]);
    if (!reward.rows[0]) return;
    const rw = reward.rows[0];

    const payoutKey = `referral_payout:${rewardId}`;
    await this.pool.query(
      `INSERT INTO referral_reward_payouts (reward_id, referrer_type, referrer_id, amount_cents, matrix_cost_cents, manager_cost_cents, territory_id, manager_id, status, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [rewardId.toString(), rw.referrer_type, rw.referrer_id, rw.total_reward_cents, rw.matrix_cost_cents, rw.manager_cost_cents, rw.territory_id, rw.manager_id, payoutKey]
    );
  }

  async processFirstRide(driverId: string, rideId: string, territoryId?: string, managerId?: string): Promise<void> {
    const { eligible, referrerId, referrerType } = await this.checkEligibility(driverId);
    if (!eligible || !referrerId || !referrerType) return;
    await this.createReward({ driverId, referrerId, referrerType, rideId, territoryId, managerId });
  }
}
