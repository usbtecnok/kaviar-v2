import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock prisma (used by auth middleware to look up passenger)
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    passengers: {
      findUnique: vi.fn(async () => ({
        id: 'pass_test_123',
        name: 'Test',
        email: 'test@test.com',
        password_changed_at: null,
      })),
    },
    // Stubs for other prisma calls that may fire on app import
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// Mock pricing-engine to avoid DB calls
vi.mock('../src/services/pricing-engine', () => ({
  haversineKm: vi.fn((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }),
  resolveProfile: vi.fn(async () => ({
    id: 'test-profile', slug: 'test',
    base_fare: 5, per_km: 2.5, per_minute: 0, minimum_fare: 8,
    fee_local: 7, fee_adjacent: 12, fee_external: 20, fee_homebound: null,
    credit_cost_local: 1, credit_cost_external: 2, max_dispatch_km: 12,
    center_lat: null, center_lng: null, radius_km: null,
  })),
}));

import app from '../src/app';

const secret = process.env.JWT_SECRET || 'test-secret';
const token = jwt.sign(
  { userId: 'pass_test_123', userType: 'PASSENGER', email: 'test@test.com' },
  secret, { expiresIn: '1h' }
);

const post = (body: any) =>
  request(app)
    .post('/api/v2/rides/estimate')
    .set('Authorization', `Bearer ${token}`)
    .send(body);

describe('/estimate', () => {
  it('corrida simples retorna preço correto', async () => {
    const res = await post({
      origin: { lat: -22.9925, lng: -43.2875 },
      destination: { lat: -22.9975, lng: -43.2625 },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { price, distance_km, wait_charge_estimate } = res.body.data;
    expect(distance_km).toBeGreaterThan(2);
    expect(distance_km).toBeLessThan(4);
    expect(price).toBeGreaterThanOrEqual(8);
    expect(wait_charge_estimate).toBeNull();
  });

  it('com post_wait_destination soma dois trechos', async () => {
    const simple = await post({
      origin: { lat: -22.9925, lng: -43.2875 },
      destination: { lat: -22.9975, lng: -43.2625 },
    });
    const withPost = await post({
      origin: { lat: -22.9925, lng: -43.2875 },
      destination: { lat: -22.9975, lng: -43.2625 },
      post_wait_destination: { lat: -22.9850, lng: -43.2750 },
    });
    expect(withPost.status).toBe(200);
    expect(withPost.body.data.distance_km).toBeGreaterThan(simple.body.data.distance_km);
    expect(withPost.body.data.price).toBeGreaterThan(simple.body.data.price);
  });

  it('com wait_estimated_min retorna wait_charge_estimate separado', async () => {
    const res = await post({
      origin: { lat: -22.9925, lng: -43.2875 },
      destination: { lat: -22.9975, lng: -43.2625 },
      wait_estimated_min: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.wait_charge_estimate).toBe(5);
  });

  it('sem campos obrigatórios retorna 400', async () => {
    const res = await post({ origin: { lat: -22.99 } });
    expect(res.status).toBe(400);
  });

  it('sem auth retorna 401', async () => {
    const res = await request(app)
      .post('/api/v2/rides/estimate')
      .send({ origin: { lat: -22.99, lng: -43.28 }, destination: { lat: -22.99, lng: -43.26 } });
    expect(res.status).toBe(401);
  });
});
