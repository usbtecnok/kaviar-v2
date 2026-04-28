import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient } = vi.hoisted(() => {
  const mockClient = { query: vi.fn(), release: vi.fn() };
  return { mockQuery: vi.fn(), mockClient };
});

vi.mock('../src/db', () => ({
  pool: { query: mockQuery, connect: vi.fn(async () => mockClient) },
}));

import { applyCreditDelta, getCreditBalance } from '../src/services/credit.service';

beforeEach(() => { vi.clearAllMocks(); });

describe('applyCreditDelta', () => {
  it('soma créditos', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (sql.includes('idempotency_key')) return { rows: [] };
      if (sql.includes('ON CONFLICT')) return {};
      if (sql.includes('UPDATE credit_balance')) return { rows: [{ balance: '10' }] };
      if (sql.includes('INSERT INTO driver_credit_ledger')) return {};
      return { rows: [] };
    });
    const r = await applyCreditDelta('d1', 10, 'purchase', 'sys');
    expect(r.balance).toBe(10);
    expect(r.alreadyProcessed).toBe(false);
  });

  it('subtrai créditos', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (sql.includes('idempotency_key')) return { rows: [] };
      if (sql.includes('ON CONFLICT')) return {};
      if (sql.includes('UPDATE credit_balance')) return { rows: [{ balance: '5' }] };
      if (sql.includes('INSERT INTO driver_credit_ledger')) return {};
      return { rows: [] };
    });
    const r = await applyCreditDelta('d1', -3, 'ride', 'sys');
    expect(r.balance).toBe(5);
  });

  it('idempotência: mesma key não duplica', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (sql.includes('idempotency_key')) return { rows: [{ id: 'x', balance_after: 15 }] };
      return { rows: [] };
    });
    const r = await applyCreditDelta('d1', 10, 'purchase', 'sys', 'key_123');
    expect(r.alreadyProcessed).toBe(true);
    expect(r.balance).toBe(15);
  });

  it('saldo não fica negativo (floor em 0)', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return {};
      if (sql.includes('idempotency_key')) return { rows: [] };
      if (sql.includes('ON CONFLICT')) return {};
      if (sql.includes('UPDATE credit_balance')) return { rows: [{ balance: '0' }] };
      if (sql.includes('INSERT INTO driver_credit_ledger')) return {};
      return { rows: [] };
    });
    const r = await applyCreditDelta('d1', -100, 'ride', 'sys');
    expect(r.balance).toBe(0);
  });
});

describe('getCreditBalance', () => {
  it('retorna saldo existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ balance: '42.5' }] });
    expect(await getCreditBalance('d1')).toBe(42.5);
  });

  it('retorna 0 se não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getCreditBalance('d1')).toBe(0);
  });
});
