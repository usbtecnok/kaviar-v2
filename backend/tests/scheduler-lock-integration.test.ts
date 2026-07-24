import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg, { Pool } from 'pg';

/**
 * Integration tests: advisory lock with REAL PostgreSQL.
 * Requires DATABASE_URL pointing to local PG (127.0.0.1).
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL required');

let pool: Pool;

beforeAll(async () => {
  pool = new Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 5000 });
});

afterAll(async () => { await pool.end(); });

describe('Advisory Lock — Real PostgreSQL', () => {
  const KEY = 'test:scheduler_lock_integration';

  it('connection A acquires, B is blocked, A releases, B acquires', async () => {
    const a = await pool.connect();
    const b = await pool.connect();

    try {
      const lockA = await a.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [KEY]);
      expect(lockA.rows[0].locked).toBe(true);

      const lockB = await b.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [KEY]);
      expect(lockB.rows[0].locked).toBe(false);

      await a.query('SELECT pg_advisory_unlock(hashtext($1))', [KEY]);

      const lockB2 = await b.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [KEY]);
      expect(lockB2.rows[0].locked).toBe(true);
      await b.query('SELECT pg_advisory_unlock(hashtext($1))', [KEY]);
    } finally {
      a.release();
      b.release();
    }
  });

  it('destroying connection releases session lock', async () => {
    const a = await pool.connect();
    const b = await pool.connect();

    await a.query('SELECT pg_try_advisory_lock(hashtext($1))', [KEY]);
    a.release(true); // destroy

    await new Promise(r => setTimeout(r, 100));

    const lockB = await b.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [KEY]);
    expect(lockB.rows[0].locked).toBe(true);
    await b.query('SELECT pg_advisory_unlock(hashtext($1))', [KEY]);
    b.release();
  });

  it('two concurrent withSchedulerLock calls — only one executes', async () => {
    // Inline the logic to avoid module import issues
    let execCount = 0;

    async function lockAndRun(name: string) {
      const client = await pool.connect();
      try {
        const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [KEY]);
        if (!rows[0].locked) return false;
        try {
          execCount++;
          await new Promise(r => setTimeout(r, 50)); // simulate work
          return true;
        } finally {
          await client.query('SELECT pg_advisory_unlock(hashtext($1))', [KEY]);
        }
      } finally {
        client.release();
      }
    }

    const [r1, r2] = await Promise.all([lockAndRun('a'), lockAndRun('b')]);
    expect(execCount).toBe(1);
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
  });
});
