import { describe, it, expect, beforeEach, vi } from "vitest";
import { WalletService } from '../../src/services/wallet-v2/wallet.service';

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn(() => ({ query: mockQuery, release: mockRelease }));
const mockPool = { query: mockQuery, connect: mockConnect } as any;

beforeEach(() => { mockQuery.mockReset(); mockRelease.mockReset(); });

describe('WalletService', () => {
  const svc = new WalletService(mockPool);

  it('ensureWallet inserts on conflict do nothing', async () => {
    mockQuery.mockResolvedValue({});
    await svc.ensureWallet('d1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), ['d1']);
  });

  it('getBalance returns available', async () => {
    mockQuery.mockResolvedValue({ rows: [{ balance_cents: '5000', reserved_cents: '1000' }] });
    const b = await svc.getBalance('d1');
    expect(b.available_cents).toBe(BigInt(4000));
  });

  it('creditRecharge credits balance', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // idempotency check
      .mockResolvedValueOnce({ rows: [{ balance_cents: '5000', reserved_cents: '0' }] }) // lock
      .mockResolvedValueOnce({}) // update wallet
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // insert ledger
      .mockResolvedValueOnce({}); // COMMIT
    const r = await svc.creditRecharge('d1', BigInt(2000), 'rch-1');
    expect(r.already_processed).toBe(false);
    expect(r.balance_after_cents).toBe(BigInt(7000));
  });

  it('creditRecharge idempotent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: '1', balance_after_cents: '7000', reserved_after_cents: '0' }] }) // found
      .mockResolvedValueOnce({}); // COMMIT
    const r = await svc.creditRecharge('d1', BigInt(2000), 'rch-1');
    expect(r.already_processed).toBe(true);
  });

  it('reserve succeeds when available >= amount', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // idempotency
      .mockResolvedValueOnce({ rows: [{ balance_cents: '5000', reserved_cents: '1000' }] }) // lock
      .mockResolvedValueOnce({}) // update
      .mockResolvedValueOnce({ rows: [{ id: '2' }] }) // ledger
      .mockResolvedValueOnce({}); // COMMIT
    const r = await svc.reserve('d1', BigInt(3000), 'ride-1');
    expect(r.reserved_after_cents).toBe(BigInt(4000));
  });

  it('reserve fails when insufficient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // idempotency
      .mockResolvedValueOnce({ rows: [{ balance_cents: '1000', reserved_cents: '800' }] }) // lock
      .mockResolvedValueOnce({}); // ROLLBACK
    await expect(svc.reserve('d1', BigInt(500), 'ride-2')).rejects.toThrow('INSUFFICIENT_BALANCE');
  });

  it('releaseReserve decreases reserved', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ balance_cents: '5000', reserved_cents: '2000' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: '3' }] })
      .mockResolvedValueOnce({});
    const r = await svc.releaseReserve('d1', BigInt(2000), 'ride-1');
    expect(r.reserved_after_cents).toBe(BigInt(0));
  });

  it('debitFee debits and releases reserve', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ balance_cents: '5000', reserved_cents: '540' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: '4' }] })
      .mockResolvedValueOnce({});
    const r = await svc.debitFee('d1', BigInt(540), BigInt(540), 'ride-1');
    expect(r.balance_after_cents).toBe(BigInt(4460));
    expect(r.reserved_after_cents).toBe(BigInt(0));
  });

  it('debitFee idempotent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: '4', balance_after_cents: '4460', reserved_after_cents: '0' }] })
      .mockResolvedValueOnce({});
    const r = await svc.debitFee('d1', BigInt(540), BigInt(540), 'ride-1');
    expect(r.already_processed).toBe(true);
  });
});
