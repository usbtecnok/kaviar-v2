import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    feature_flags: { findUnique: vi.fn() },
    operational_territories: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';
import { isMotoExpressEnabled } from '../src/services/moto-express-flag.service';

const mockFlags = prisma.feature_flags.findUnique as ReturnType<typeof vi.fn>;
const mockTerritory = prisma.operational_territories.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('isMotoExpressEnabled', () => {
  it('returns false when global flag disabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_EXPRESS', enabled: false });
    expect(await isMotoExpressEnabled()).toBe(false);
  });

  it('returns true when global flag enabled and no territoryId', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_EXPRESS', enabled: true });
    expect(await isMotoExpressEnabled()).toBe(true);
  });

  it('returns false when global enabled but territory disabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_EXPRESS', enabled: true });
    mockTerritory.mockResolvedValue({ moto_express_enabled: false });
    expect(await isMotoExpressEnabled('territory-1')).toBe(false);
  });

  it('returns true when global enabled and territory enabled', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_EXPRESS', enabled: true });
    mockTerritory.mockResolvedValue({ moto_express_enabled: true });
    expect(await isMotoExpressEnabled('territory-1')).toBe(true);
  });

  it('returns false when territory not found', async () => {
    mockFlags.mockResolvedValue({ key: 'ENABLE_MOTO_EXPRESS', enabled: true });
    mockTerritory.mockResolvedValue(null);
    expect(await isMotoExpressEnabled('nonexistent')).toBe(false);
  });

  it('returns false when flag not found in DB', async () => {
    mockFlags.mockResolvedValue(null);
    expect(await isMotoExpressEnabled()).toBe(false);
  });

  it('returns false on DB error', async () => {
    mockFlags.mockRejectedValue(new Error('connection lost'));
    expect(await isMotoExpressEnabled()).toBe(false);
  });
});
