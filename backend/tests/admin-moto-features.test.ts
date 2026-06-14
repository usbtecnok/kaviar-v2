import { describe, it, expect } from 'vitest';

describe('admin-drivers vehicle_type filter logic', () => {
  const VALID_TYPES = ['CAR', 'MOTORCYCLE'];

  function validateVehicleType(value: string | undefined): { valid: boolean; error?: string } {
    if (!value) return { valid: true }; // no filter = show all
    if (!VALID_TYPES.includes(value)) return { valid: false, error: 'vehicle_type inválido. Use CAR ou MOTORCYCLE.' };
    return { valid: true };
  }

  function buildWhere(status?: string, vehicleType?: string): Record<string, any> {
    const where: any = status ? { status } : {};
    if (vehicleType) where.vehicle_type = vehicleType;
    return where;
  }

  it('no vehicle_type param — no filter applied', () => {
    const where = buildWhere('active');
    expect(where).toEqual({ status: 'active' });
    expect(where.vehicle_type).toBeUndefined();
  });

  it('vehicle_type=CAR — filters CAR', () => {
    const where = buildWhere(undefined, 'CAR');
    expect(where.vehicle_type).toBe('CAR');
  });

  it('vehicle_type=MOTORCYCLE — filters MOTORCYCLE', () => {
    const where = buildWhere(undefined, 'MOTORCYCLE');
    expect(where.vehicle_type).toBe('MOTORCYCLE');
  });

  it('invalid vehicle_type — returns error', () => {
    expect(validateVehicleType('TRUCK')).toEqual({ valid: false, error: 'vehicle_type inválido. Use CAR ou MOTORCYCLE.' });
  });

  it('undefined vehicle_type — valid (no filter)', () => {
    expect(validateVehicleType(undefined)).toEqual({ valid: true });
  });

  it('CAR is valid', () => {
    expect(validateVehicleType('CAR')).toEqual({ valid: true });
  });

  it('MOTORCYCLE is valid', () => {
    expect(validateVehicleType('MOTORCYCLE')).toEqual({ valid: true });
  });
});

describe('admin-territories moto_express_enabled', () => {
  // Simulates the zod schema + update logic
  function parseAndBuildUpdates(body: Record<string, any>): { updates: Record<string, any>; error?: string } {
    const updates: any = {};
    if (body.moto_express_enabled !== undefined) {
      if (typeof body.moto_express_enabled !== 'boolean') {
        return { updates: {}, error: 'moto_express_enabled must be boolean' };
      }
      updates.moto_express_enabled = body.moto_express_enabled;
    }
    return { updates };
  }

  it('moto_express_enabled=true sets flag', () => {
    const { updates } = parseAndBuildUpdates({ moto_express_enabled: true });
    expect(updates.moto_express_enabled).toBe(true);
  });

  it('moto_express_enabled=false clears flag', () => {
    const { updates } = parseAndBuildUpdates({ moto_express_enabled: false });
    expect(updates.moto_express_enabled).toBe(false);
  });

  it('omitting moto_express_enabled does not change it', () => {
    const { updates } = parseAndBuildUpdates({ name: 'test' });
    expect(updates.moto_express_enabled).toBeUndefined();
  });

  it('non-boolean moto_express_enabled is invalid', () => {
    const { error } = parseAndBuildUpdates({ moto_express_enabled: 'yes' });
    expect(error).toBeDefined();
  });
});
