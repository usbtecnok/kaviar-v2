import { describe, it, expect } from 'vitest';

/**
 * Tests for wait_charge accounting rules:
 * - final_price = locked_price + wait_charge
 * - fee_amount stays calculated on locked_price only
 * - driver_earnings = (locked_price - fee_amount) + wait_charge
 * - fee_amount + driver_earnings = final_price
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeSettlement(locked_price: number, fee_percent: number, waitMinutes: number, ratePerMin: number) {
  const fee_amount = round2(locked_price * fee_percent / 100);
  const base_earnings = round2(locked_price - fee_amount);
  const wait_charge = round2(waitMinutes * ratePerMin);
  const final_price = round2(locked_price + wait_charge);
  const driver_earnings = round2(base_earnings + wait_charge);
  return { locked_price, final_price, fee_amount, driver_earnings, wait_charge };
}

describe('wait_charge accounting', () => {
  it('corrida sem espera: fee + earnings = final_price', () => {
    const s = computeSettlement(12.15, 12, 0, 0.50);
    expect(s.final_price).toBe(12.15);
    expect(s.wait_charge).toBe(0);
    expect(round2(s.fee_amount + s.driver_earnings)).toBe(s.final_price);
  });

  it('corrida com espera 2 min: wait_charge vai 100% para motorista', () => {
    const s = computeSettlement(12.15, 12, 2, 0.50);
    expect(s.wait_charge).toBe(1.00);
    expect(s.final_price).toBe(13.15);
    expect(s.fee_amount).toBe(1.46); // 12% de 12.15
    expect(s.driver_earnings).toBe(11.69); // 10.69 + 1.00
    expect(round2(s.fee_amount + s.driver_earnings)).toBe(s.final_price);
  });

  it('corrida com espera 10 min: fee não muda com wait_charge', () => {
    const s = computeSettlement(12.15, 12, 10, 0.50);
    const sNoWait = computeSettlement(12.15, 12, 0, 0.50);
    expect(s.fee_amount).toBe(sNoWait.fee_amount);
    expect(s.wait_charge).toBe(5.00);
    expect(s.driver_earnings).toBe(round2(sNoWait.driver_earnings + 5.00));
    expect(round2(s.fee_amount + s.driver_earnings)).toBe(s.final_price);
  });

  it('espera longa (497 min): contabilidade fecha', () => {
    const s = computeSettlement(51.77, 12, 497, 0.50);
    expect(s.wait_charge).toBe(248.50);
    expect(s.final_price).toBe(300.27);
    expect(round2(s.fee_amount + s.driver_earnings)).toBe(s.final_price);
  });

  it('espera 0 min: sem wait_charge', () => {
    const s = computeSettlement(8.00, 7, 0, 0.50);
    expect(s.wait_charge).toBe(0);
    expect(s.final_price).toBe(8.00);
    expect(round2(s.fee_amount + s.driver_earnings)).toBe(s.final_price);
  });
});
