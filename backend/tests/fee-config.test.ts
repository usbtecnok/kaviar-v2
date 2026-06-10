import { describe, it, expect } from 'vitest';

describe('fee and split calculation (pure)', () => {
  const calcFee = (cents: number, pct: number) => Math.round(cents * pct / 100);
  const calcSplit = (fee: number, matrixPct: number) => {
    const m = Math.round(fee * matrixPct / 100);
    return { matrix: m, manager: fee - m };
  };

  it('18% of R$20 (2000 cents) = 360', () => expect(calcFee(2000, 18)).toBe(360));
  it('18% of R$21.50 (2150 cents) = 387', () => expect(calcFee(2150, 18)).toBe(387));
  it('18% of R$12.15 (1215 cents) = 219', () => expect(calcFee(1215, 18)).toBe(219));
  it('18% of 1 cent = 0', () => expect(calcFee(1, 18)).toBe(0));
  it('18% of 6 cents = 1', () => expect(calcFee(6, 18)).toBe(1));
  it('18% of R$100 (10000) = 1800', () => expect(calcFee(10000, 18)).toBe(1800));

  it('split 60/40 of 360 → 216 + 144 = 360', () => {
    const s = calcSplit(360, 60);
    expect(s.matrix).toBe(216);
    expect(s.manager).toBe(144);
    expect(s.matrix + s.manager).toBe(360);
  });

  it('split 60/40 of 387 → 232 + 155 = 387', () => {
    const s = calcSplit(387, 60);
    expect(s.matrix).toBe(232);
    expect(s.manager).toBe(155);
    expect(s.matrix + s.manager).toBe(387);
  });

  it('split never loses cents: odd fee 359 → 215 + 144 = 359', () => {
    const s = calcSplit(359, 60);
    expect(s.matrix + s.manager).toBe(359);
  });

  it('split 100/0 (no manager) → matrix = fee', () => {
    const s = calcSplit(360, 100);
    expect(s.matrix).toBe(360);
    expect(s.manager).toBe(0);
  });

  it('driver_earnings = final - fee', () => {
    const final = 2150;
    const fee = calcFee(final, 18);
    expect(final - fee).toBe(1763);
  });

  it('reference_month: 23:59 BRT Jun 30 → June', () => {
    const date = new Date('2026-06-30T23:59:00-03:00');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
    }).formatToParts(date);
    expect(parts.find(p => p.type === 'month')!.value).toBe('06');
  });

  it('reference_month: 02:30 UTC Jul 1 → still June in SP', () => {
    const date = new Date('2026-07-01T02:30:00Z');
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit'
    }).formatToParts(date);
    expect(parts.find(p => p.type === 'month')!.value).toBe('06');
  });

  it('shares always sum to fee for any value', () => {
    for (const fee of [1, 7, 99, 100, 359, 387, 1000, 9999]) {
      const s = calcSplit(fee, 60);
      expect(s.matrix + s.manager).toBe(fee);
    }
  });
});
