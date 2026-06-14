import { describe, it, expect } from 'vitest';

/**
 * Tests for dispatcher vehicle_type filtering logic.
 * Pure unit tests that validate the filter condition without DB.
 */
describe('dispatcher vehicle_type filter', () => {
  // Replicate the exact filter logic from dispatcher.service.ts
  function shouldIncludeDriver(
    serviceCategory: string | null | undefined,
    driverVehicleType: string | null | undefined
  ): boolean {
    const category = serviceCategory || 'CAR_NORMAL';
    const requiredVehicleType = (category === 'MOTO_DELIVERY' || category === 'MOTO_PASSENGER') ? 'MOTORCYCLE' : null;
    if (requiredVehicleType && (driverVehicleType || 'CAR') !== requiredVehicleType) {
      return false;
    }
    return true;
  }

  describe('MOTO_DELIVERY', () => {
    it('includes MOTORCYCLE driver', () => {
      expect(shouldIncludeDriver('MOTO_DELIVERY', 'MOTORCYCLE')).toBe(true);
    });

    it('excludes CAR driver', () => {
      expect(shouldIncludeDriver('MOTO_DELIVERY', 'CAR')).toBe(false);
    });

    it('excludes driver with null vehicle_type (defaults to CAR)', () => {
      expect(shouldIncludeDriver('MOTO_DELIVERY', null)).toBe(false);
    });

    it('excludes driver with undefined vehicle_type (defaults to CAR)', () => {
      expect(shouldIncludeDriver('MOTO_DELIVERY', undefined)).toBe(false);
    });
  });

  describe('CAR_NORMAL', () => {
    it('includes CAR driver', () => {
      expect(shouldIncludeDriver('CAR_NORMAL', 'CAR')).toBe(true);
    });

    it('includes MOTORCYCLE driver (no filter applied)', () => {
      expect(shouldIncludeDriver('CAR_NORMAL', 'MOTORCYCLE')).toBe(true);
    });

    it('includes driver with null vehicle_type', () => {
      expect(shouldIncludeDriver('CAR_NORMAL', null)).toBe(true);
    });
  });

  describe('MOTO_PASSENGER', () => {
    it('includes MOTORCYCLE driver', () => {
      expect(shouldIncludeDriver('MOTO_PASSENGER', 'MOTORCYCLE')).toBe(true);
    });

    it('excludes CAR driver', () => {
      expect(shouldIncludeDriver('MOTO_PASSENGER', 'CAR')).toBe(false);
    });

    it('excludes driver with null vehicle_type (defaults to CAR)', () => {
      expect(shouldIncludeDriver('MOTO_PASSENGER', null)).toBe(false);
    });

    it('excludes driver with undefined vehicle_type (defaults to CAR)', () => {
      expect(shouldIncludeDriver('MOTO_PASSENGER', undefined)).toBe(false);
    });
  });

  describe('absent/unknown service_category (legacy)', () => {
    it('null category treats as CAR_NORMAL — includes all', () => {
      expect(shouldIncludeDriver(null, 'CAR')).toBe(true);
      expect(shouldIncludeDriver(null, 'MOTORCYCLE')).toBe(true);
    });

    it('undefined category treats as CAR_NORMAL — includes all', () => {
      expect(shouldIncludeDriver(undefined, 'CAR')).toBe(true);
      expect(shouldIncludeDriver(undefined, 'MOTORCYCLE')).toBe(true);
    });

    it('unknown category treats as no filter — includes all', () => {
      expect(shouldIncludeDriver('SOMETHING_ELSE', 'CAR')).toBe(true);
      expect(shouldIncludeDriver('SOMETHING_ELSE', 'MOTORCYCLE')).toBe(true);
    });
  });
});
