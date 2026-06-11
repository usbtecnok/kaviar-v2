import { Pool } from 'pg';

export interface FeeSplit {
  fee_amount_cents: bigint;
  matrix_share_cents: bigint;
  manager_share_cents: bigint;
}

export interface FeeSplitRecord extends FeeSplit {
  id: bigint;
  already_processed: boolean;
}

export class FeeSplitService {
  constructor(private pool: Pool) {}

  calculateSplit(finalPriceCents: bigint): FeeSplit {
    const fee = BigInt(Math.round(Number(finalPriceCents) * 18 / 100));
    const matrix = BigInt(Math.round(Number(fee) * 60 / 100));
    const manager = fee - matrix;
    return { fee_amount_cents: fee, matrix_share_cents: matrix, manager_share_cents: manager };
  }

  async recordSplit(params: {
    rideId: string; driverId: string; finalPriceCents: bigint;
    territoryId?: string; managerId?: string; collected: boolean;
  }): Promise<FeeSplitRecord> {
    const key = `ride_fee_split:${params.rideId}`;
    const existing = await this.pool.query('SELECT id FROM ride_fee_splits WHERE idempotency_key = $1', [key]);
    if (existing.rows[0]) {
      const split = this.calculateSplit(params.finalPriceCents);
      return { ...split, id: BigInt(existing.rows[0].id), already_processed: true };
    }

    const split = this.calculateSplit(params.finalPriceCents);
    const collectedCents = params.collected ? split.fee_amount_cents : BigInt(0);
    const pendingCents = params.collected ? BigInt(0) : split.fee_amount_cents;
    const status = params.collected ? 'collected' : 'pending';
    const month = this.referenceMonth();

    const r = await this.pool.query(
      `INSERT INTO ride_fee_splits (ride_id, driver_id, final_price_cents, fee_percent, fee_amount_cents, fee_collected_cents, fee_pending_cents, matrix_share_percent, matrix_share_cents, manager_share_percent, manager_share_cents, territory_id, manager_id, reference_month, collection_status, idempotency_key)
       VALUES ($1,$2,$3,18.00,$4,$5,$6,60.00,$7,40.00,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [params.rideId, params.driverId, params.finalPriceCents.toString(), split.fee_amount_cents.toString(), collectedCents.toString(), pendingCents.toString(), split.matrix_share_cents.toString(), split.manager_share_cents.toString(), params.territoryId || null, params.managerId || null, month, status, key]
    );

    return { ...split, id: BigInt(r.rows[0].id), already_processed: false };
  }

  async markCollected(rideId: string): Promise<void> {
    await this.pool.query(
      `UPDATE ride_fee_splits SET fee_collected_cents = fee_amount_cents, fee_pending_cents = 0, collection_status = 'collected' WHERE ride_id = $1 AND collection_status = 'pending'`,
      [rideId]
    );
  }

  private referenceMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
