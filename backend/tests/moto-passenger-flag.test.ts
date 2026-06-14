import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    feature_flags: { findUnique: vi.fn() },
    operational_territories: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';
import { isMotoPassengerEnabled } from '../src/services/moto-passenger-flag.service';

const mockFlags = prisma.feature_flags.findUnique as ReturnType<typeof vi.fn>;
const mockTerritory = prisma.operational_territories.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('isMotoPassengerEnabled', () => {
  it('returns false when global flag disabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_PASSENGER', enabled: false });
    expect(await isMotoPassengerEnabled()).toBe(false);
  });

  it('returns false when flag not found in DB', async () => {
    mockFlags.mockResolvedValue(null);
    expect(await isMotoPassengerEnabled()).toBe(false);
  });

  it('returns false on DB error', async () => {
    mockFlags.mockRejectedValue(new Error('connection lost'));
    expect(await isMotoPassengerEnabled()).toBe(false);
  });

  it('returns true when global flag enabled and no territoryId', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_PASSENGER', enabled: true });
    expect(await isMotoPassengerEnabled()).toBe(true);
  });

  it('returns false when global enabled but territory disabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_PASSENGER', enabled: true });
    mockTerritory.mockResolvedValue({ moto_passenger_enabled: false });
    expect(await isMotoPassengerEnabled('territory-1')).toBe(false);
  });

  it('returns true when global enabled and territory enabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_PASSENGER', enabled: true });
    mockTerritory.mockResolvedValue({ moto_passenger_enabled: true });
    expect(await isMotoPassengerEnabled('territory-1')).toBe(true);
  });

  it('returns false when territory not found', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_PASSENGER', enabled: true });
    mockTerritory.mockResolvedValue(null);
    expect(await isMotoPassengerEnabled('nonexistent')).toBe(false);
  });
});
