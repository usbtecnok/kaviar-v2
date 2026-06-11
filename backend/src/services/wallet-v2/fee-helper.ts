/**
 * Fee calculation helper for Wallet V2.
 * Single source of truth for 18% fee computation.
 */

const FEE_PERCENT = 18;

export function calculateFeeCents(finalPriceCents: number): number {
  return Math.round(finalPriceCents * FEE_PERCENT / 100);
}

export function estimateFeeCentsFromPrice(priceReais: number): number {
  return Math.round(priceReais * 100 * FEE_PERCENT / 100);
}
