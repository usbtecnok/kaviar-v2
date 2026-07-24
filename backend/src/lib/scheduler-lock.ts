import { pool } from '../db';
import type { PoolClient } from 'pg';

/**
 * Executes `fn` under a PostgreSQL session-level advisory lock.
 * If the lock cannot be acquired (another instance holds it), skips silently.
 *
 * Lock and unlock happen on the SAME dedicated PoolClient (same TCP connection).
 * The finally block guarantees unlock + release even on errors.
 *
 * @returns true if the lock was acquired and fn executed, false if skipped.
 */
export async function withSchedulerLock(lockName: string, fn: () => Promise<void>): Promise<boolean> {
  let client: PoolClient | null = null;
  let acquired = false;

  try {
    client = await pool.connect();

    const { rows } = await client.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [lockName]
    );

    acquired = rows[0]?.locked === true;
    if (!acquired) return false;

    await fn();
    return true;
  } finally {
    if (client) {
      if (acquired) {
        try {
          await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]);
        } catch (unlockErr: any) {
          console.error(`[SCHEDULER_LOCK_UNLOCK_ERROR] ${lockName}:`, unlockErr?.message);
        }
      }
      client.release();
    }
  }
}
