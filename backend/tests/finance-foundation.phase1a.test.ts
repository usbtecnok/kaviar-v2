import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  admins: { upsert: vi.fn() },
  neighborhoods: { upsert: vi.fn(), update: vi.fn() },
  communities: { upsert: vi.fn() },
  operational_territories: { upsert: vi.fn() },
  financial_categories: { upsert: vi.fn() },
  financial_cost_centers: { upsert: vi.fn() },
  financial_recognition_policies: { upsert: vi.fn() },
  municipal_regulations: { upsert: vi.fn() },
  municipal_regulation_requirements: { deleteMany: vi.fn(), createMany: vi.fn() },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

describe('finance foundation phase 1A', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.admins.upsert.mockResolvedValue({ id: 'admin-1' });
    prismaMock.neighborhoods.upsert.mockResolvedValue({ id: 'bairro-centro-rj' });
    prismaMock.neighborhoods.update.mockResolvedValue({});
    prismaMock.communities.upsert.mockResolvedValue({});
    prismaMock.operational_territories.upsert.mockResolvedValue({ id: 'territory-rj-city' });
    prismaMock.financial_categories.upsert.mockResolvedValue({ id: 'category-1' });
    prismaMock.financial_cost_centers.upsert.mockResolvedValue({ id: 'cc-1' });
    prismaMock.financial_recognition_policies.upsert.mockResolvedValue({ id: 'policy-1' });
    prismaMock.municipal_regulations.upsert.mockResolvedValue({ id: 'reg-1' });
    prismaMock.municipal_regulation_requirements.deleteMany.mockResolvedValue({});
    prismaMock.municipal_regulation_requirements.createMany.mockResolvedValue({});
  });

  it('exposes only UNCLASSIFIED recognition policies in seed', async () => {
    const seed = await import('../prisma/seed');
    expect(seed.FINANCE_RECOGNITION_POLICY_SEEDS).toHaveLength(5);
    expect(new Set(seed.FINANCE_RECOGNITION_POLICY_SEEDS.map((item: any) => item.policy))).toEqual(new Set(['UNCLASSIFIED']));
    expect(new Set(seed.FINANCE_RECOGNITION_POLICY_SEEDS.map((item: any) => item.status))).toEqual(new Set(['DRAFT']));
  });

  it('seeds finance foundation idempotently through upsert calls', async () => {
    const seed = await import('../prisma/seed');

    await seed.seedFinancialFoundation('admin-1', 'territory-rj-city');
    await seed.seedFinancialFoundation('admin-1', 'territory-rj-city');

    expect(prismaMock.financial_categories.upsert).toHaveBeenCalled();
    expect(prismaMock.financial_cost_centers.upsert).toHaveBeenCalled();
    expect(prismaMock.financial_recognition_policies.upsert).toHaveBeenCalled();

    const categoryCodes = prismaMock.financial_categories.upsert.mock.calls.map((call: any[]) => call[0].where.code);
    const uniqueCodes = new Set(categoryCodes);
    expect(uniqueCodes.size).toBe(categoryCodes.length / 2);
  });
});