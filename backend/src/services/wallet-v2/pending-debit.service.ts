import { Pool } from 'pg';

export class PendingDebitService {
  constructor(private pool: Pool) {}

  async create(params: { rideId: string; driverId: string; finalPriceCents: bigint; feeAmountCents: bigint; reservedCents: bigint }): Promise<{ id: bigint; already_processed: boolean }> {
    const key = `pending_debit:${params.rideId}`;
    const existing = await this.pool.query('SELECT id FROM pending_debits WHERE idempotency_key = $1', [key]);
    if (existing.rows[0]) return { id: BigInt(existing.rows[0].id), already_processed: true };

    const r = await this.pool.query(
      `INSERT INTO pending_debits (ride_id, driver_id, final_price_cents, fee_percent_snapshot, fee_amount_cents, fee_collected_cents, fee_pending_cents, reserved_amount_cents, reason, status, idempotency_key)
       VALUES ($1,$2,$3,18.00,$4,0,$5,$6,'platform_fee','pending',$7) RETURNING id`,
      [params.rideId, params.driverId, params.finalPriceCents.toString(), params.feeAmountCents.toString(), params.feeAmountCents.toString(), params.reservedCents.toString(), key]
    );
    return { id: BigInt(r.rows[0].id), already_processed: false };
  }

  async resolveOnRecharge(driverId: string, walletService: any, feeSplitService: any, territoryLedgerService: any): Promise<number> {
    const pendings = await this.pool.query(
      "SELECT id, ride_id, fee_pending_cents, driver_id FROM pending_debits WHERE driver_id = $1 AND status = 'pending' ORDER BY created_at ASC",
      [driverId]
    );

    let resolved = 0;
    for (const p of pendings.rows) {
      const feePending = BigInt(p.fee_pending_cents);
      try {
        await walletService.debitPending(driverId, feePending, p.id.toString());
        await this.pool.query(
          "UPDATE pending_debits SET status = 'resolved', fee_collected_cents = fee_amount_cents, fee_pending_cents = 0, resolved_at = NOW() WHERE id = $1",
          [p.id]
        );
        await feeSplitService.markCollected(p.ride_id);

        const split = await this.pool.query('SELECT territory_id, manager_id, manager_share_cents, reference_month FROM ride_fee_splits WHERE ride_id = $1', [p.ride_id]);
        if (split.rows[0]?.territory_id) {
          await territoryLedgerService.recordFeeShare(split.rows[0].territory_id, split.rows[0].manager_id, BigInt(split.rows[0].manager_share_cents), p.ride_id, split.rows[0].reference_month);
        }
        resolved++;
      } catch {
        await this.pool.query('UPDATE pending_debits SET attempts = attempts + 1 WHERE id = $1', [p.id]);
        break;
      }
    }
    return resolved;
  }

  async getDriverPendings(driverId: string): Promise<any[]> {
    const r = await this.pool.query("SELECT * FROM pending_debits WHERE driver_id = $1 AND status = 'pending' ORDER BY created_at", [driverId]);
    return r.rows;
  }
}
