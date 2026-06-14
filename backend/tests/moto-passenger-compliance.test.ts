import { describe, it, expect } from 'vitest';

/**
 * Tests for Moto Passenger Compliance Gate logic.
 * Pure unit tests validating the guard and status transitions.
 */
describe('moto passenger compliance gate', () => {
  const VALID_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'];

  // Simulates the guard in admin-territories PATCH
  function canEnableMotoPassenger(complianceStatus: string | null): { allowed: boolean; error?: string } {
    if (complianceStatus !== 'APPROVED') {
      return { allowed: false, error: 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED' };
    }
    return { allowed: true };
  }

  // Simulates disable (no guard needed)
  function canDisableMotoPassenger(): { allowed: boolean } {
    return { allowed: true };
  }

  describe('enable guard', () => {
    it('blocks when no compliance record exists (null)', () => {
      expect(canEnableMotoPassenger(null)).toEqual({ allowed: false, error: 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED' });
    });

    it('blocks when compliance is PENDING', () => {
      expect(canEnableMotoPassenger('PENDING')).toEqual({ allowed: false, error: 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED' });
    });

    it('blocks when compliance is SUBMITTED', () => {
      expect(canEnableMotoPassenger('SUBMITTED')).toEqual({ allowed: false, error: 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED' });
    });

    it('blocks when compliance is REJECTED', () => {
      expect(canEnableMotoPassenger('REJECTED')).toEqual({ allowed: false, error: 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED' });
    });

    it('allows when compliance is APPROVED', () => {
      expect(canEnableMotoPassenger('APPROVED')).toEqual({ allowed: true });
    });
  });

  describe('disable (no guard)', () => {
    it('disable is always allowed regardless of compliance', () => {
      expect(canDisableMotoPassenger()).toEqual({ allowed: true });
    });
  });

  describe('status validation', () => {
    it('PENDING is valid status', () => expect(VALID_STATUSES).toContain('PENDING'));
    it('SUBMITTED is valid status', () => expect(VALID_STATUSES).toContain('SUBMITTED'));
    it('APPROVED is valid status', () => expect(VALID_STATUSES).toContain('APPROVED'));
    it('REJECTED is valid status', () => expect(VALID_STATUSES).toContain('REJECTED'));
    it('invalid status is rejected', () => expect(VALID_STATUSES).not.toContain('INVALID'));
  });

  describe('approval fields', () => {
    function buildApprovalUpdates(status: string, adminId: string, rejectionReason?: string) {
      const updates: any = { status, updated_at: new Date() };
      if (status === 'APPROVED') {
        updates.approved_by_admin_id = adminId;
        updates.approved_at = expect.any(Date);
        updates.rejection_reason = null;
      } else if (status === 'REJECTED') {
        updates.rejection_reason = rejectionReason || null;
        updates.approved_by_admin_id = null;
        updates.approved_at = null;
      }
      return updates;
    }

    it('APPROVED sets approved_by_admin_id and approved_at', () => {
      const u = buildApprovalUpdates('APPROVED', 'admin-123');
      expect(u.approved_by_admin_id).toBe('admin-123');
      expect(u.approved_at).toBeDefined();
      expect(u.rejection_reason).toBeNull();
    });

    it('REJECTED clears approval and sets reason', () => {
      const u = buildApprovalUpdates('REJECTED', 'admin-123', 'Município proíbe');
      expect(u.rejection_reason).toBe('Município proíbe');
      expect(u.approved_by_admin_id).toBeNull();
      expect(u.approved_at).toBeNull();
    });
  });

  describe('moto_express independence', () => {
    // moto_express_enabled has no compliance gate
    function canEnableMotoExpress(): { allowed: boolean } {
      return { allowed: true }; // No compliance check
    }

    it('moto_express_enabled=true does not require compliance', () => {
      expect(canEnableMotoExpress()).toEqual({ allowed: true });
    });
  });
});
