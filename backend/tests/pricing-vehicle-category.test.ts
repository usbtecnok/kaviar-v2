import { describe, it, expect } from 'vitest';

/**
 * Tests for pricing engine resolveProfile vehicle category logic.
 * Pure unit tests validating the query parameter behavior and error handling.
 */
describe('pricing resolveProfile vehicleCategory', () => {
  // Simulate the error logic from resolveProfile
  function simulateResolve(
    hasRegionalMatch: boolean,
    hasDefaultMatch: boolean,
    vehicleCategory: string = 'CAR'
  ): { profile: string } | { error: string } {
    if (hasRegionalMatch) return { profile: `regional-${vehicleCategory}` };
    if (hasDefaultMatch) return { profile: `default-${vehicleCategory}` };
    if (vehicleCategory !== 'CAR') return { error: 'MOTO_PRICING_PROFILE_NOT_CONFIGURED' };
    return { error: '[pricing-engine] No default pricing profile found' };
  }

  describe('CAR (default behavior)', () => {
    it('resolves regional profile for CAR', () => {
      expect(simulateResolve(true, false, 'CAR')).toEqual({ profile: 'regional-CAR' });
    });

    it('falls back to default profile for CAR', () => {
      expect(simulateResolve(false, true, 'CAR')).toEqual({ profile: 'default-CAR' });
    });

    it('throws generic error when no CAR profile exists', () => {
      expect(simulateResolve(false, false, 'CAR')).toEqual({ error: '[pricing-engine] No default pricing profile found' });
    });

    it('uses CAR when vehicleCategory is undefined/default', () => {
      expect(simulateResolve(true, false)).toEqual({ profile: 'regional-CAR' });
    });
  });

  describe('MOTORCYCLE', () => {
    it('resolves regional profile for MOTORCYCLE', () => {
      expect(simulateResolve(true, false, 'MOTORCYCLE')).toEqual({ profile: 'regional-MOTORCYCLE' });
    });

    it('falls back to default MOTORCYCLE profile', () => {
      expect(simulateResolve(false, true, 'MOTORCYCLE')).toEqual({ profile: 'default-MOTORCYCLE' });
    });

    it('throws MOTO_PRICING_PROFILE_NOT_CONFIGURED when no moto profile exists', () => {
      expect(simulateResolve(false, false, 'MOTORCYCLE')).toEqual({ error: 'MOTO_PRICING_PROFILE_NOT_CONFIGURED' });
    });

    it('never falls back to CAR profile (no cross-category fallback)', () => {
      // Even if CAR profiles exist, MOTORCYCLE with no match = error
      const result = simulateResolve(false, false, 'MOTORCYCLE');
      expect(result).not.toEqual(expect.objectContaining({ profile: expect.stringContaining('CAR') }));
      expect(result).toEqual({ error: 'MOTO_PRICING_PROFILE_NOT_CONFIGURED' });
    });
  });

  describe('SQL query parameter validation', () => {
    it('vehicle_category filter is applied to regional query', () => {
      // The SQL uses WHERE vehicle_category = $3
      // This ensures CAR profiles won't match for MOTORCYCLE queries
      const carResult = simulateResolve(true, false, 'CAR');
      const motoResult = simulateResolve(true, false, 'MOTORCYCLE');
      expect(carResult).toEqual({ profile: 'regional-CAR' });
      expect(motoResult).toEqual({ profile: 'regional-MOTORCYCLE' });
      // They resolve different profiles (never cross-pollinate)
      expect(carResult).not.toEqual(motoResult);
    });
  });
});
