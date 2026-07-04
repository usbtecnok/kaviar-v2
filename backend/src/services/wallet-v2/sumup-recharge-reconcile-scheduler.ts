import { pool } from '../../db';
import { reconcilePendingSumUpRecharges } from './sumup-recharge.service';

const DEFAULT_INTERVAL_MS = 300000; // 5 min
const DEFAULT_BATCH_LIMIT = 20;
const SCHEDULER_LOCK_KEY = 'kaviar:sumup_recharge_reconcile_scheduler';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function startSumUpRechargeReconcileScheduler(): void {
  const intervalMs = Math.max(30000, parsePositiveInt(process.env.SUMUP_RECONCILE_INTERVAL_MS, DEFAULT_INTERVAL_MS));
  const batchLimit = Math.min(200, Math.max(1, parsePositiveInt(process.env.SUMUP_RECONCILE_BATCH_LIMIT, DEFAULT_BATCH_LIMIT)));
  const minAgeMinutes = 1;

  let running = false;

  const runCycle = async () => {
    if (running) {
      console.warn('[SUMUP_RECONCILE_SCHEDULER] Previous cycle still running; skipping this tick.');
      return;
    }

    running = true;
    const startedAt = Date.now();
    let lockClient: any = null;
    let lockAcquired = false;

    try {
      lockClient = await pool.connect();

      const lockResult = await lockClient.query(
        "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
        [SCHEDULER_LOCK_KEY]
      );

      lockAcquired = lockResult.rows[0]?.locked === true;
      if (!lockAcquired) {
        console.log('[SUMUP_RECONCILE_SCHEDULER] Another scheduler instance is running; skipping this tick.');
        return;
      }

      const result = await reconcilePendingSumUpRecharges(batchLimit, minAgeMinutes);
      const tookMs = Date.now() - startedAt;
      console.log(
        `[SUMUP_RECONCILE_SCHEDULER] scanned=${result.scanned} confirmed=${result.confirmed} expired=${result.expired} pending=${result.pending} errors=${result.errors} took_ms=${tookMs}`
      );
    } catch (error: any) {
      // Keep scheduler resilient; log only non-sensitive information.
      const message = error?.message || 'unknown_error';
      console.error(`[SUMUP_RECONCILE_SCHEDULER_ERROR] ${message}`);
    } finally {
      if (lockClient) {
        if (lockAcquired) {
          try {
            await lockClient.query(
              "SELECT pg_advisory_unlock(hashtext($1))",
              [SCHEDULER_LOCK_KEY]
            );
          } catch (unlockError: any) {
            const message = unlockError?.message || 'unlock_failed';
            console.error(`[SUMUP_RECONCILE_SCHEDULER_UNLOCK_ERROR] ${message}`);
          }
        }

        lockClient.release();
      }

      running = false;
    }
  };

  setInterval(() => {
    runCycle().catch((err) => {
      const message = (err as any)?.message || 'unknown_error';
      console.error(`[SUMUP_RECONCILE_SCHEDULER_UNHANDLED] ${message}`);
    });
  }, intervalMs);

  console.log(
    `[SUMUP_RECONCILE_SCHEDULER] Started (interval_ms=${intervalMs}, batch_limit=${batchLimit}, min_age_minutes=${minAgeMinutes})`
  );
}
