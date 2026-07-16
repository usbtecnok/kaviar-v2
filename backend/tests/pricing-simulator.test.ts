import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../src/db', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../src/services/google-directions.service', () => ({
  getRouteDistance: vi.fn(),
}));

vi.mock('../src/services/territory-resolver.service', () => ({
  resolveTerritory: vi.fn(),
}));

vi.mock('../src/services/territory-floor.service', () => ({
  getFloorForRoute: vi.fn(),
}));

vi.mock('../src/services/pricing-engine', () => ({
  resolveProfile: vi.fn(),
  haversineKm: vi.fn(),
  classifyRouteFromIds: vi.fn(),
  classifyWithDriver: vi.fn(),
  isFlatFeeEnabled: vi.fn(),
  feeForTerritory: vi.fn(),
  creditForTerritory: vi.fn(),
}));

import { simulateRidePricing } from '../src/services/pricing-simulator.service';
import { getRouteDistance } from '../src/services/google-directions.service';
import { resolveTerritory } from '../src/services/territory-resolver.service';
import { getFloorForRoute } from '../src/services/territory-floor.service';
import * as pricingEngine from '../src/services/pricing-engine';

const defaultProfile = {
  id: 'profile-1',
  slug: 'default-car',
  base_fare: 4,
  per_km: 1,
  per_minute: 0.2,
  minimum_fare: 8,
  fee_local: 7,
  fee_adjacent: 12,
  fee_external: 20,
  fee_homebound: null,
  surcharge_external: 3,
  credit_cost_local: 1,
  credit_cost_external: 2,
  max_dispatch_km: 20,
  center_lat: null,
  center_lng: null,
  radius_km: null,
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(pricingEngine.resolveProfile).mockResolvedValue(defaultProfile as any);
  vi.mocked(resolveTerritory).mockResolvedValue({
    resolved: true,
    community: null,
    neighborhood: { id: 'n-1', name: 'Centro' },
    method: 'neighborhood',
    srid: 4326,
  } as any);
  vi.mocked(pricingEngine.classifyRouteFromIds).mockReturnValue('local' as any);
  vi.mocked(pricingEngine.classifyWithDriver).mockReturnValue('external' as any);
  vi.mocked(getFloorForRoute).mockResolvedValue(null);
  vi.mocked(pricingEngine.feeForTerritory).mockReturnValue(20);
  vi.mocked(pricingEngine.creditForTerritory).mockReturnValue({ cost: 2, matchType: 'EXTERNAL' });
});

describe('simulateRidePricing', () => {
  it('modelo flat usa rota Google, inclui per_minute e zera creditos', async () => {
    vi.mocked(getRouteDistance).mockResolvedValue({ distance_km: 5, duration_min: 10, source: 'google_route' });
    vi.mocked(pricingEngine.isFlatFeeEnabled).mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ platform_fee_percent: 18 }] });

    const result = await simulateRidePricing({
      origin_lat: -22.9,
      origin_lng: -43.2,
      dest_lat: -22.91,
      dest_lng: -43.21,
    });

    expect(result.pricing_source).toBe('google_route');
    expect(result.duration_min).toBe(10);
    expect(result.billable_minutes).toBe(10);
    expect(result.raw_price).toBe(11);
    expect(result.price).toBe(11);
    expect(result.fee_model).toBe('FLAT_FEE');
    expect(result.fee_percent).toBe(18);
    expect(result.fee_amount).toBe(1.98);
    expect(result.driver_earnings).toBe(9.02);
    expect(result.credit_cost).toBe(0);
    expect(result.credit_value).toBe(0);
    expect(result.driver_net_after_credit).toBe(result.driver_earnings);
  });

  it('fallback usa haversine quando Google nao retorna rota', async () => {
    vi.mocked(getRouteDistance).mockResolvedValue(null);
    vi.mocked(pricingEngine.haversineKm).mockReturnValue(3.3333);
    vi.mocked(pricingEngine.isFlatFeeEnabled).mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ platform_fee_percent: 18 }] });

    const result = await simulateRidePricing({
      origin_lat: -22.9,
      origin_lng: -43.2,
      dest_lat: -22.91,
      dest_lng: -43.21,
    });

    expect(result.pricing_source).toBe('fallback_haversine');
    expect(result.duration_min).toBe(0);
    expect(result.billable_minutes).toBe(0);
    expect(result.distance_km).toBe(3.33);
  });

  it('aplica piso territorial quando piso for maior que preco calculado', async () => {
    vi.mocked(getRouteDistance).mockResolvedValue({ distance_km: 5, duration_min: 10, source: 'google_route' });
    vi.mocked(getFloorForRoute).mockResolvedValue({
      id: 'floor-1',
      territory_id: 't-1',
      origin_label: 'A',
      dest_label: 'B',
      floor_price: 20,
      surcharge: 0,
      total_floor: 20,
      notes: null,
    });
    vi.mocked(pricingEngine.isFlatFeeEnabled).mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [{ platform_fee_percent: 18 }] });

    const result = await simulateRidePricing({
      origin_lat: -22.9,
      origin_lng: -43.2,
      dest_lat: -22.91,
      dest_lng: -43.21,
    });

    expect(result.territory_floor_applied).toBe(true);
    expect(result.territory_floor_value).toBe(20);
    expect(result.price).toBe(20);
  });

  it('modo legado usa taxa territorial e credito legado', async () => {
    vi.mocked(getRouteDistance).mockResolvedValue({ distance_km: 5, duration_min: 10, source: 'google_route' });
    vi.mocked(pricingEngine.isFlatFeeEnabled).mockResolvedValue(false);

    const result = await simulateRidePricing({
      origin_lat: -22.9,
      origin_lng: -43.2,
      dest_lat: -22.91,
      dest_lng: -43.21,
      driver_neighborhood_id: 'driver-1',
    });

    expect(result.fee_model).toBe('TERRITORIAL_CREDITS');
    expect(result.fee_percent).toBe(20);
    expect(result.fee_amount).toBe(2.2);
    expect(result.driver_earnings).toBe(8.8);
    expect(result.credit_cost).toBe(2);
    expect(result.credit_value).toBe(4);
    expect(result.driver_net_after_credit).toBe(4.8);
  });
});
