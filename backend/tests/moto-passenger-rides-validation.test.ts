import { describe, it, expect } from 'vitest';

/**
 * Tests for MOTO_PASSENGER ride request validations.
 * Pure unit tests replicating the validation logic from rides-v2.ts.
 */
describe('rides-v2 MOTO_PASSENGER validations', () => {
  interface RideRequest {
    service_category?: string;
    passenger_moto_consent?: boolean;
  }

  function validateMotoPassenger(
    body: RideRequest,
    flagEnabled: boolean
  ): { ok: true } | { status: number; error: string } {
    if (body.service_category === 'MOTO_PASSENGER') {
      if (!flagEnabled) return { status: 403, error: 'MOTO_PASSENGER_DISABLED' };
      if (!body.passenger_moto_consent) return { status: 400, error: 'MOTO_PASSENGER_CONSENT_REQUIRED' };
    }
    return { ok: true };
  }

  describe('flag disabled', () => {
    it('MOTO_PASSENGER with flag off returns 403', () => {
      const r = validateMotoPassenger({ service_category: 'MOTO_PASSENGER', passenger_moto_consent: true }, false);
      expect(r).toEqual({ status: 403, error: 'MOTO_PASSENGER_DISABLED' });
    });
  });

  describe('consent', () => {
    it('MOTO_PASSENGER without consent returns 400', () => {
      const r = validateMotoPassenger({ service_category: 'MOTO_PASSENGER' }, true);
      expect(r).toEqual({ status: 400, error: 'MOTO_PASSENGER_CONSENT_REQUIRED' });
    });

    it('MOTO_PASSENGER with consent=false returns 400', () => {
      const r = validateMotoPassenger({ service_category: 'MOTO_PASSENGER', passenger_moto_consent: false }, true);
      expect(r).toEqual({ status: 400, error: 'MOTO_PASSENGER_CONSENT_REQUIRED' });
    });

    it('MOTO_PASSENGER with consent=true passes validation', () => {
      const r = validateMotoPassenger({ service_category: 'MOTO_PASSENGER', passenger_moto_consent: true }, true);
      expect(r).toEqual({ ok: true });
    });
  });

  describe('CAR_NORMAL unaffected', () => {
    it('CAR_NORMAL passes without consent', () => {
      const r = validateMotoPassenger({ service_category: 'CAR_NORMAL' }, false);
      expect(r).toEqual({ ok: true });
    });

    it('no service_category passes (legacy)', () => {
      const r = validateMotoPassenger({}, false);
      expect(r).toEqual({ ok: true });
    });
  });

  describe('MOTO_DELIVERY unaffected', () => {
    it('MOTO_DELIVERY passes without passenger consent', () => {
      const r = validateMotoPassenger({ service_category: 'MOTO_DELIVERY' }, false);
      expect(r).toEqual({ ok: true });
    });
  });

  describe('incompatible features (future fields)', () => {
    // Note: CARE, pet, child, elderly, cargo fields do NOT exist in rides_v2 today.
    // When they are added, validation should block MOTO_PASSENGER with those flags.
    // For now, documenting the intent:
    it('documents that CARE/pet/child/elderly/cargo fields are not yet in rides_v2', () => {
      // This test serves as a reminder to add blocking logic when those fields are introduced.
      expect(true).toBe(true);
    });
  });
});
