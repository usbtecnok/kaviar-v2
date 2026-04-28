import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockFindFirst, mockCreate, mockAggregate, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockAggregate: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    rides_v2: { findUnique: mockFindUnique },
    rides: { findUnique: vi.fn(async () => null) },
    ratings: { findUnique: mockFindFirst, create: mockCreate, aggregate: mockAggregate },
    rating_stats: { upsert: mockUpsert },
  },
}));

import { RatingService } from '../src/services/rating';

const svc = new RatingService();
beforeEach(() => { vi.clearAllMocks(); });

describe('createRating — raterType DRIVER', () => {
  const base = {
    rideId: 'ride_1', raterId: 'driver_1', ratedId: 'pass_1',
    raterType: 'DRIVER' as const, score: 4, comment: 'Bom passageiro', tags: 'Pontual',
  };

  it('entity_type é PASSENGER quando motorista avalia', async () => {
    mockFindUnique.mockResolvedValue({ status: 'completed', driver_id: 'driver_1', passenger_id: 'pass_1' });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'r1', rating: 4, comment: 'Bom', created_at: new Date() });
    mockAggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { rating: 1 }, _sum: { rating: 4 } });
    mockUpsert.mockResolvedValue({});

    const r = await svc.createRating(base);
    expect(r.success).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.entity_type).toBe('PASSENGER');
  });

  it('entity_type é DRIVER quando passageiro avalia', async () => {
    mockFindUnique.mockResolvedValue({ status: 'completed', driver_id: 'driver_1', passenger_id: 'pass_1' });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'r2', rating: 5, comment: null, created_at: new Date() });
    mockAggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 }, _sum: { rating: 5 } });
    mockUpsert.mockResolvedValue({});

    const r = await svc.createRating({ ...base, raterType: 'PASSENGER', raterId: 'pass_1', ratedId: 'driver_1' });
    expect(r.success).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.entity_type).toBe('DRIVER');
  });

  it('motorista não avalia corrida alheia', async () => {
    mockFindUnique.mockResolvedValue({ status: 'completed', driver_id: 'other', passenger_id: 'pass_1' });
    const r = await svc.createRating(base);
    expect(r.success).toBe(false);
    expect(r.error).toBe('RATER_NOT_IN_RIDE');
  });

  it('passageiro não avalia corrida alheia', async () => {
    mockFindUnique.mockResolvedValue({ status: 'completed', driver_id: 'driver_1', passenger_id: 'other' });
    const r = await svc.createRating({ ...base, raterType: 'PASSENGER', raterId: 'pass_1', ratedId: 'driver_1' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('RATER_NOT_IN_RIDE');
  });

  it('updateRatingStats usa entity_type correto', async () => {
    mockFindUnique.mockResolvedValue({ status: 'completed', driver_id: 'driver_1', passenger_id: 'pass_1' });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'r3', rating: 3, comment: null, created_at: new Date() });
    mockAggregate.mockResolvedValue({ _avg: { rating: 3 }, _count: { rating: 1 }, _sum: { rating: 3 } });
    mockUpsert.mockResolvedValue({});

    await svc.createRating(base);
    expect(mockAggregate.mock.calls[0][0].where.entity_type).toBe('PASSENGER');
    expect(mockUpsert.mock.calls[0][0].where.entity_type_entity_id.entity_type).toBe('PASSENGER');
  });
});
