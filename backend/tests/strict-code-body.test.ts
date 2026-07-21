import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Simulando o schema corrigido
const strictCodeBody = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'code inválido'),
);

describe('strictCodeBody - Case Preservation', () => {
  describe('should accept and preserve lowercase codes', () => {
    it('ride_revenue.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('ride_revenue.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ride_revenue.default');
      }
    });

    it('prepaid_driver_credits.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('prepaid_driver_credits.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('prepaid_driver_credits.default');
      }
    });

    it('manager_payments.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('manager_payments.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('manager_payments.default');
      }
    });

    it('commercial_payments.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('commercial_payments.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('commercial_payments.default');
      }
    });

    it('other.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('other.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('other.default');
      }
    });

    it('ride-revenue_2026.default stays lowercase', () => {
      const result = strictCodeBody.safeParse('ride-revenue_2026.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ride-revenue_2026.default');
      }
    });
  });

  describe('should preserve uppercase codes', () => {
    it('RIDE_REVENUE.DEFAULT stays uppercase', () => {
      const result = strictCodeBody.safeParse('RIDE_REVENUE.DEFAULT');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('RIDE_REVENUE.DEFAULT');
      }
    });

    it('MixedCase.Code stays mixed case', () => {
      const result = strictCodeBody.safeParse('MixedCase.Code');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('MixedCase.Code');
      }
    });
  });

  describe('should trim whitespace only', () => {
    it('trims leading/trailing spaces but preserves case', () => {
      const result = strictCodeBody.safeParse('  ride_revenue.city_rio_2026  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ride_revenue.city_rio_2026');
      }
    });

    it('trims uppercase with spaces', () => {
      const result = strictCodeBody.safeParse('  RIDE_REVENUE.DEFAULT  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('RIDE_REVENUE.DEFAULT');
      }
    });
  });

  describe('should reject invalid codes', () => {
    it('rejects empty string', () => {
      const result = strictCodeBody.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects whitespace only', () => {
      const result = strictCodeBody.safeParse('   ');
      expect(result.success).toBe(false);
    });

    it('rejects code starting with dot', () => {
      const result = strictCodeBody.safeParse('.ride_revenue');
      expect(result.success).toBe(false);
    });

    it('rejects code with spaces', () => {
      const result = strictCodeBody.safeParse('ride revenue');
      expect(result.success).toBe(false);
    });

    it('rejects code with @ symbol', () => {
      const result = strictCodeBody.safeParse('ride@revenue');
      expect(result.success).toBe(false);
    });

    it('rejects code exceeding 120 chars', () => {
      const longCode = 'a'.repeat(121);
      const result = strictCodeBody.safeParse(longCode);
      expect(result.success).toBe(false);
    });

    it('rejects code with invalid characters', () => {
      const result = strictCodeBody.safeParse('ride_revenue!@#');
      expect(result.success).toBe(false);
    });
  });

  describe('should handle edge cases', () => {
    it('accepts code with numbers and allowed symbols', () => {
      const result = strictCodeBody.safeParse('code123_test-policy.v2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('code123_test-policy.v2');
      }
    });

    it('accepts single character', () => {
      const result = strictCodeBody.safeParse('a');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('a');
      }
    });

    it('accepts code starting with number', () => {
      const result = strictCodeBody.safeParse('2026_policy.default');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('2026_policy.default');
      }
    });
  });
});
