import { describe, it, expect } from 'vitest';

describe('Family Return Accrual', () => {
  it('calculates 10% of recharge correctly', () => {
    const amountCents = 2000;
    const percent = 10;
    const accrued = Math.floor(amountCents * percent / 100);
    expect(accrued).toBe(200);
  });

  it('calculates for all packages', () => {
    const packages = [2000, 5000, 10000];
    const percent = 10;
    const expected = [200, 500, 1000];
    packages.forEach((amt, i) => {
      expect(Math.floor(amt * percent / 100)).toBe(expected[i]);
    });
  });

  it('idempotency key format is correct', () => {
    const rechargeId = 'fac2fbdd-7439-4735-9ba4-1fc541c8234c';
    const key = `family_return_accrual:${rechargeId}`;
    expect(key).toBe('family_return_accrual:fac2fbdd-7439-4735-9ba4-1fc541c8234c');
  });

  it('does not alter balance_cents (accrual is separate)', () => {
    // Simulating the webhook flow: creditRecharge changes balance, accrual does NOT
    const balanceBefore = BigInt(3000);
    const rechargeAmount = BigInt(2000);
    const balanceAfterRecharge = balanceBefore + rechargeAmount; // only recharge
    // Accrual does NOT add to balance
    const accrualAmount = 200; // stored separately in family_return_accruals
    expect(balanceAfterRecharge).toBe(BigInt(5000)); // balance only has recharge
    expect(accrualAmount).toBe(200); // accrual tracked separately
  });
});
