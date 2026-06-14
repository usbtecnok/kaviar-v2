import { describe, it, expect } from 'vitest';
import { MOTO_REQUIRED_DOCUMENTS, MOTO_PASSENGER_EXTRA_DOCUMENTS, getMissingMotoDocuments, getMissingMotoPassengerDocuments } from '../src/config/moto-documents';

describe('moto-documents config', () => {
  it('has 4 required document types', () => {
    expect(MOTO_REQUIRED_DOCUMENTS).toHaveLength(4);
  });

  it('includes CNH_A', () => {
    expect(MOTO_REQUIRED_DOCUMENTS.find(d => d.type === 'CNH_A')).toBeDefined();
  });

  it('includes CRLV_MOTO', () => {
    expect(MOTO_REQUIRED_DOCUMENTS.find(d => d.type === 'CRLV_MOTO')).toBeDefined();
  });

  it('includes MOTORCYCLE_PHOTO', () => {
    expect(MOTO_REQUIRED_DOCUMENTS.find(d => d.type === 'MOTORCYCLE_PHOTO')).toBeDefined();
  });

  it('includes MOTO_EXPRESS_RESPONSIBILITY_TERM', () => {
    expect(MOTO_REQUIRED_DOCUMENTS.find(d => d.type === 'MOTO_EXPRESS_RESPONSIBILITY_TERM')).toBeDefined();
  });
});

describe('getMissingMotoDocuments', () => {
  it('returns all docs when none uploaded', () => {
    expect(getMissingMotoDocuments([])).toHaveLength(4);
  });

  it('returns missing docs when partial upload', () => {
    const missing = getMissingMotoDocuments(['CNH_A', 'CRLV_MOTO']);
    expect(missing).toHaveLength(2);
    expect(missing.map(d => d.type)).toContain('MOTORCYCLE_PHOTO');
    expect(missing.map(d => d.type)).toContain('MOTO_EXPRESS_RESPONSIBILITY_TERM');
  });

  it('returns empty when all docs uploaded', () => {
    const allTypes = MOTO_REQUIRED_DOCUMENTS.map(d => d.type);
    expect(getMissingMotoDocuments([...allTypes])).toHaveLength(0);
  });

  it('ignores extra docs not in required list', () => {
    const allTypes = [...MOTO_REQUIRED_DOCUMENTS.map(d => d.type), 'EXTRA_DOC'];
    expect(getMissingMotoDocuments(allTypes)).toHaveLength(0);
  });
});

describe('driver registration vehicle_type logic', () => {
  // Pure logic validation (no DB)
  function resolveVehicleType(input: string | undefined | null): string {
    return input || 'CAR';
  }

  it('defaults to CAR when vehicle_type is undefined', () => {
    expect(resolveVehicleType(undefined)).toBe('CAR');
  });

  it('defaults to CAR when vehicle_type is null', () => {
    expect(resolveVehicleType(null)).toBe('CAR');
  });

  it('accepts CAR explicitly', () => {
    expect(resolveVehicleType('CAR')).toBe('CAR');
  });

  it('accepts MOTORCYCLE explicitly', () => {
    expect(resolveVehicleType('MOTORCYCLE')).toBe('MOTORCYCLE');
  });
});

describe('moto approval validation', () => {
  function canApproveMotoDriver(vehicleType: string, uploadedDocTypes: string[]): { approved: boolean; missing?: string[] } {
    if (vehicleType !== 'MOTORCYCLE') return { approved: true };
    const missing = getMissingMotoDocuments(uploadedDocTypes);
    if (missing.length > 0) return { approved: false, missing: missing.map(d => d.type) };
    return { approved: true };
  }

  it('CAR driver does not need moto docs', () => {
    expect(canApproveMotoDriver('CAR', [])).toEqual({ approved: true });
  });

  it('MOTORCYCLE without CNH_A cannot be approved', () => {
    const result = canApproveMotoDriver('MOTORCYCLE', ['CRLV_MOTO', 'MOTORCYCLE_PHOTO', 'MOTO_EXPRESS_RESPONSIBILITY_TERM']);
    expect(result.approved).toBe(false);
    expect(result.missing).toContain('CNH_A');
  });

  it('MOTORCYCLE without CRLV_MOTO cannot be approved', () => {
    const result = canApproveMotoDriver('MOTORCYCLE', ['CNH_A', 'MOTORCYCLE_PHOTO', 'MOTO_EXPRESS_RESPONSIBILITY_TERM']);
    expect(result.approved).toBe(false);
    expect(result.missing).toContain('CRLV_MOTO');
  });

  it('MOTORCYCLE without MOTORCYCLE_PHOTO cannot be approved', () => {
    const result = canApproveMotoDriver('MOTORCYCLE', ['CNH_A', 'CRLV_MOTO', 'MOTO_EXPRESS_RESPONSIBILITY_TERM']);
    expect(result.approved).toBe(false);
    expect(result.missing).toContain('MOTORCYCLE_PHOTO');
  });

  it('MOTORCYCLE without term cannot be approved', () => {
    const result = canApproveMotoDriver('MOTORCYCLE', ['CNH_A', 'CRLV_MOTO', 'MOTORCYCLE_PHOTO']);
    expect(result.approved).toBe(false);
    expect(result.missing).toContain('MOTO_EXPRESS_RESPONSIBILITY_TERM');
  });

  it('MOTORCYCLE with all docs can be approved', () => {
    const allDocs = ['CNH_A', 'CRLV_MOTO', 'MOTORCYCLE_PHOTO', 'MOTO_EXPRESS_RESPONSIBILITY_TERM'];
    expect(canApproveMotoDriver('MOTORCYCLE', allDocs)).toEqual({ approved: true });
  });

  it('CAR driver approval is unaffected by any docs', () => {
    expect(canApproveMotoDriver('CAR', [])).toEqual({ approved: true });
    expect(canApproveMotoDriver('CAR', ['CNH_A'])).toEqual({ approved: true });
  });
});

describe('MOTO_PASSENGER_EXTRA_DOCUMENTS', () => {
  it('has 2 extra document types', () => {
    expect(MOTO_PASSENGER_EXTRA_DOCUMENTS).toHaveLength(2);
  });

  it('includes MOTO_PASSENGER_RESPONSIBILITY_TERM', () => {
    expect(MOTO_PASSENGER_EXTRA_DOCUMENTS.find(d => d.type === 'MOTO_PASSENGER_RESPONSIBILITY_TERM')).toBeDefined();
  });

  it('includes HELMET_PASSENGER_DECLARATION', () => {
    expect(MOTO_PASSENGER_EXTRA_DOCUMENTS.find(d => d.type === 'HELMET_PASSENGER_DECLARATION')).toBeDefined();
  });
});

describe('getMissingMotoPassengerDocuments', () => {
  it('returns all 6 docs when none uploaded', () => {
    expect(getMissingMotoPassengerDocuments([])).toHaveLength(6);
  });

  it('returns missing passenger docs when base moto docs uploaded', () => {
    const baseDocs = MOTO_REQUIRED_DOCUMENTS.map(d => d.type);
    const missing = getMissingMotoPassengerDocuments([...baseDocs]);
    expect(missing).toHaveLength(2);
    expect(missing.map(d => d.type)).toContain('MOTO_PASSENGER_RESPONSIBILITY_TERM');
    expect(missing.map(d => d.type)).toContain('HELMET_PASSENGER_DECLARATION');
  });

  it('returns empty when all 6 docs uploaded', () => {
    const allDocs = [...MOTO_REQUIRED_DOCUMENTS.map(d => d.type), ...MOTO_PASSENGER_EXTRA_DOCUMENTS.map(d => d.type)];
    expect(getMissingMotoPassengerDocuments(allDocs)).toHaveLength(0);
  });

  it('base moto docs helper still works independently', () => {
    expect(getMissingMotoDocuments([])).toHaveLength(4);
    const allBase = MOTO_REQUIRED_DOCUMENTS.map(d => d.type);
    expect(getMissingMotoDocuments([...allBase])).toHaveLength(0);
  });
});
