import { describe, it, expect, vi } from 'vitest';

// Mock db to prevent DATABASE_URL error on import
vi.mock('../src/db', () => ({ pool: { query: vi.fn() } }));

import { haversineKm, feeForTerritory, PricingProfile } from '../src/services/pricing-engine';

const profile: PricingProfile = {
  id: 'test', slug: 'test',
  base_fare: 5, per_km: 2.5, per_minute: 0, minimum_fare: 8,
  fee_local: 7, fee_adjacent: 12, fee_external: 20, fee_homebound: 3,
  credit_cost_local: 1, credit_cost_external: 2, max_dispatch_km: 12,
  center_lat: null, center_lng: null, radius_km: null,
};

describe('haversineKm', () => {
  it('mesma coordenada retorna 0', () => {
    expect(haversineKm(-22.99, -43.28, -22.99, -43.28)).toBe(0);
  });

  it('Itanhangá → São Conrado ≈ 2.6 km', () => {
    const d = haversineKm(-22.9925, -43.2875, -22.9975, -43.2625);
    expect(d).toBeGreaterThan(2);
    expect(d).toBeLessThan(3.5);
  });

  it('distâncias maiores são proporcionais', () => {
    const short = haversineKm(-22.99, -43.28, -22.99, -43.27);
    const long = haversineKm(-22.99, -43.28, -22.99, -43.20);
    expect(long).toBeGreaterThan(short * 3);
  });
});

describe('feeForTerritory', () => {
  it('local → fee_local', () => {
    expect(feeForTerritory(profile, 'local')).toBe(7);
  });

  it('adjacent → fee_adjacent', () => {
    expect(feeForTerritory(profile, 'adjacent')).toBe(12);
  });

  it('external → fee_external', () => {
    expect(feeForTerritory(profile, 'external')).toBe(20);
  });

  it('homebound local → fee_homebound', () => {
    expect(feeForTerritory(profile, 'local', true)).toBe(3);
  });

  it('homebound external → fee_external (homebound só aplica local/adjacent)', () => {
    expect(feeForTerritory(profile, 'external', true)).toBe(20);
  });

  it('homebound sem fee_homebound → fee normal', () => {
    const noHomebound = { ...profile, fee_homebound: null };
    expect(feeForTerritory(noHomebound, 'local', true)).toBe(7);
  });
});
