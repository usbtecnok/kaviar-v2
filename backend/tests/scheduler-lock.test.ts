import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for withSchedulerLock helper.
 * Uses mocked pg pool to verify lock/unlock/release mechanics.
 */

let lockHolder: string | null = null;
let released: string[] = [];

function createMockClient(id: string) {
  return {
    query: vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('pg_try_advisory_lock')) {
        if (lockHolder === null) {
          lockHolder = id;
          return { rows: [{ locked: true }] };
        }
        return { rows: [{ locked: false }] };
      }
      if (sql.includes('pg_advisory_unlock')) {
        if (lockHolder === id) lockHolder = null;
        return { rows: [{ unlocked: true }] };
      }
      return { rows: [] };
    }),
    release: vi.fn(() => { released.push(id); }),
  };
}

const mockPool = { connect: vi.fn() };

vi.mock('../src/db', () => ({ pool: mockPool }));

beforeEach(() => {
  lockHolder = null;
  released = [];
  mockPool.connect.mockReset();
});

describe('withSchedulerLock', () => {
  it('executes fn when lock is acquired', async () => {
    const client = createMockClient('c1');
    mockPool.connect.mockResolvedValue(client);

    const { withSchedulerLock } = await import('../src/lib/scheduler-lock');
    let executed = false;
    const result = await withSchedulerLock('test:lock', async () => { executed = true; });

    expect(result).toBe(true);
    expect(executed).toBe(true);
    expect(released).toContain('c1');
  });

  it('skips fn when lock is already held', async () => {
    lockHolder = 'other';
    const client = createMockClient('c2');
    mockPool.connect.mockResolvedValue(client);

    const { withSchedulerLock } = await import('../src/lib/scheduler-lock');
    let executed = false;
    const result = await withSchedulerLock('test:lock', async () => { executed = true; });

    expect(result).toBe(false);
    expect(executed).toBe(false);
    expect(released).toContain('c2');
  });

  it('releases lock even when fn throws', async () => {
    const client = createMockClient('c3');
    mockPool.connect.mockResolvedValue(client);

    const { withSchedulerLock } = await import('../src/lib/scheduler-lock');
    await expect(
      withSchedulerLock('test:lock', async () => { throw new Error('boom'); })
    ).rejects.toThrow('boom');

    expect(lockHolder).toBeNull();
    expect(released).toContain('c3');
  });

  it('two concurrent calls — only one executes', async () => {
    mockPool.connect.mockImplementation(async () => createMockClient(`c_${Date.now()}_${Math.random()}`));

    const { withSchedulerLock } = await import('../src/lib/scheduler-lock');
    let execCount = 0;

    const [r1, r2] = await Promise.all([
      withSchedulerLock('test:lock', async () => { execCount++; }),
      withSchedulerLock('test:lock', async () => { execCount++; }),
    ]);

    expect(execCount).toBe(1);
    expect([r1, r2].filter(Boolean)).toHaveLength(1);
  });
});
