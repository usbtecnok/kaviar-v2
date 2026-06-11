import { Pool } from 'pg';

export interface MonthSummary {
  gross_cents: bigint;
  referral_costs_cents: bigint;
  family_return_costs_cents: bigint;
  adjustments_cents: bigint;
  net_cents: bigint;
}

export class TerritoryLedgerService {
  constructor(private pool: Pool) {}

  async recordFeeShare(territoryId: string, managerId: string | null, amountCents: bigint, rideId: string, month: string): Promise<void> {
    const key = `territory_fee_share:${rideId}`;
    await this.pool.query(
      `INSERT INTO territory_ledger (territory_id, manager_id, reference_month, entry_type, amount_cents, description, reference_type, reference_id, idempotency_key)
       VALUES ($1,$2,$3,'fee_share',$4,'Parcela gestor 40% da taxa','ride',$5,$6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [territoryId, managerId, month, amountCents.toString(), rideId, key]
    );
  }

  async recordReferralCost(territoryId: string, managerId: string | null, amountCents: bigint, rewardId: string, month: string): Promise<void> {
    const key = `territory_referral_cost:${rewardId}`;
    await this.pool.query(
      `INSERT INTO territory_ledger (territory_id, manager_id, reference_month, entry_type, amount_cents, description, reference_type, reference_id, idempotency_key)
       VALUES ($1,$2,$3,'referral_cost',$4,'Custo indicacao gestor R$10','reward',$5,$6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [territoryId, managerId, month, (-amountCents).toString(), rewardId, key]
    );
  }

  async recordFamilyReturnCost(territoryId: string, managerId: string | null, amountCents: bigint, requestId: string, month: string): Promise<void> {
    const key = `territory_family_return_cost:${requestId}`;
    await this.pool.query(
      `INSERT INTO territory_ledger (territory_id, manager_id, reference_month, entry_type, amount_cents, description, reference_type, reference_id, idempotency_key)
       VALUES ($1,$2,$3,'family_return_cost',$4,'Custo retorno familiar 50% gestor','family_return',$5,$6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [territoryId, managerId, month, (-amountCents).toString(), requestId, key]
    );
  }

  async getMonthSummary(territoryId: string, month: string): Promise<MonthSummary> {
    const r = await this.pool.query(
      `SELECT entry_type, COALESCE(SUM(amount_cents),0) as total FROM territory_ledger WHERE territory_id=$1 AND reference_month=$2 GROUP BY entry_type`,
      [territoryId, month]
    );
    let gross = BigInt(0), referral = BigInt(0), family = BigInt(0), adj = BigInt(0);
    for (const row of r.rows) {
      const v = BigInt(row.total);
      if (row.entry_type === 'fee_share') gross = v;
      else if (row.entry_type === 'referral_cost') referral = v;
      else if (row.entry_type === 'family_return_cost') family = v;
      else if (row.entry_type === 'adjustment') adj = v;
    }
    return { gross_cents: gross, referral_costs_cents: referral, family_return_costs_cents: family, adjustments_cents: adj, net_cents: gross + referral + family + adj };
  }
}
