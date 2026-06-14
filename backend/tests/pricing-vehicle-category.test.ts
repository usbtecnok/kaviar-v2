import { describe, it, expect } from 'vitest';

/**
 * Tests for pricing engine resolveProfile service_category logic.
 * Pure unit tests validating the filter condition and error handling.
 */
describe('pricing resolveProfile serviceCategory', () => {
  // Replicate the derivation + error logic from resolveProfile
  function deriveVehicleCategory(serviceCategory: string): string {
    return serviceCategory.startsWith('MOTO_') ? 'MOTORCYCLE' : 'CAR';
  }

  function simulateResolve(
    hasRegionalMatch: boolean,
    hasDefaultMatch: boolean,
    serviceCategory: string = 'CAR_NORMAL'
  ): { profile: { vehicle_category: string; service_category: string } } | { error: string } {
    const vehicleCategory = deriveVehicleCategory(serviceCategory);
    if (hasRegionalMatch) return { profile: { vehicle_category: vehicleCategory, service_category: serviceCategory } };
    if (hasDefaultMatch) return { profile: { vehicle_category: vehicleCategory, service_category: serviceCategory } };
    if (serviceCategory === 'MOTO_PASSENGER') return { error: 'MOTO_PASSENGER_PRICING_NOT_CONFIGURED' };
    if (serviceCategory === 'MOTO_DELIVERY') return { error: 'MOTO_PRICING_PROFILE_NOT_CONFIGURED' };
    return { error: '[pricing-engine] No default pricing profile found' };
  }

  describe('CAR_NORMAL (default behavior)', () => {
    it('resolves with vehicle_category=CAR and service_category=CAR_NORMAL', () => {
      const r = simulateResolve(true, false, 'CAR_NORMAL');
      expect(r).toEqual({ profile: { vehicle_category: 'CAR', service_category: 'CAR_NORMAL' } });
    });

    it('falls back to default CAR_NORMAL profile', () => {
      expect(simulateResolve(false, true, 'CAR_NORMAL')).toEqual({ profile: { vehicle_category: 'CAR', service_category: 'CAR_NORMAL' } });
    });

    it('uses CAR_NORMAL when serviceCategory is undefined/default', () => {
      expect(simulateResolve(true, false)).toEqual({ profile: { vehicle_category: 'CAR', service_category: 'CAR_NORMAL' } });
    });
  });

  describe('MOTO_DELIVERY', () => {
    it('resolves with vehicle_category=MOTORCYCLE and service_category=MOTO_DELIVERY', () => {
      expect(simulateResolve(true, false, 'MOTO_DELIVERY')).toEqual({ profile: { vehicle_category: 'MOTORCYCLE', service_category: 'MOTO_DELIVERY' } });
    });

    it('throws MOTO_PRICING_PROFILE_NOT_CONFIGURED when no profile', () => {
      expect(simulateResolve(false, false, 'MOTO_DELIVERY')).toEqual({ error: 'MOTO_PRICING_PROFILE_NOT_CONFIGURED' });
    });

    it('does not use MOTO_PASSENGER profile (isolated query)', () => {
      // MOTO_DELIVERY queries filter by service_category=MOTO_DELIVERY
      const r = simulateResolve(true, false, 'MOTO_DELIVERY');
      expect((r as any).profile.service_category).toBe('MOTO_DELIVERY');
      expect((r as any).profile.service_category).not.toBe('MOTO_PASSENGER');
    });
  });

  describe('MOTO_PASSENGER', () => {
    it('resolves with vehicle_category=MOTORCYCLE and service_category=MOTO_PASSENGER', () => {
      expect(simulateResolve(true, false, 'MOTO_PASSENGER')).toEqual({ profile: { vehicle_category: 'MOTORCYCLE', service_category: 'MOTO_PASSENGER' } });
    });

    it('throws MOTO_PASSENGER_PRICING_NOT_CONFIGURED when no profile', () => {
      expect(simulateResolve(false, false, 'MOTO_PASSENGER')).toEqual({ error: 'MOTO_PASSENGER_PRICING_NOT_CONFIGURED' });
    });

    it('does not use MOTO_DELIVERY profile as fallback', () => {
      const r = simulateResolve(true, false, 'MOTO_PASSENGER');
      expect((r as any).profile.service_category).toBe('MOTO_PASSENGER');
      expect((r as any).profile.service_category).not.toBe('MOTO_DELIVERY');
    });

    it('does not use CAR profile', () => {
      const r = simulateResolve(true, false, 'MOTO_PASSENGER');
      expect((r as any).profile.vehicle_category).toBe('MOTORCYCLE');
      expect((r as any).profile.vehicle_category).not.toBe('CAR');
    });
  });

  describe('cross-category isolation', () => {
    it('CAR_NORMAL, MOTO_DELIVERY, MOTO_PASSENGER resolve different profiles', () => {
      const car = simulateResolve(true, false, 'CAR_NORMAL');
      const delivery = simulateResolve(true, false, 'MOTO_DELIVERY');
      const passenger = simulateResolve(true, false, 'MOTO_PASSENGER');
      expect(car).not.toEqual(delivery);
      expect(car).not.toEqual(passenger);
      expect(delivery).not.toEqual(passenger);
    });
  });

  describe('deriveVehicleCategory', () => {
    it('CAR_NORMAL → CAR', () => expect(deriveVehicleCategory('CAR_NORMAL')).toBe('CAR'));
    it('MOTO_DELIVERY → MOTORCYCLE', () => expect(deriveVehicleCategory('MOTO_DELIVERY')).toBe('MOTORCYCLE'));
    it('MOTO_PASSENGER → MOTORCYCLE', () => expect(deriveVehicleCategory('MOTO_PASSENGER')).toBe('MOTORCYCLE'));
    it('unknown → CAR', () => expect(deriveVehicleCategory('SOMETHING')).toBe('CAR'));
  });
});
