import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const routes: { method: 'get' | 'post' | 'put'; path: string }[] = [
  { method: 'get',  path: '/api/admin/dashboard/overview' },
  { method: 'get',  path: '/api/admin/dashboard/territory' },
  { method: 'get',  path: '/api/ratings/driver/test' },
  { method: 'post', path: '/api/ratings' },
  { method: 'get',  path: '/api/drivers/fake/dashboard' },
  { method: 'get',  path: '/api/drivers/fake/notifications' },
  { method: 'get',  path: '/api/passengers/fake/locations' },
  { method: 'get',  path: '/api/trips/fee-percentage' },
  { method: 'get',  path: '/api/drivers/fake/neighborhood-stats' },
  { method: 'put',  path: '/api/admin/drivers/fake/photo-approve' },
  { method: 'get',  path: '/api/passengers/me/community-status' },
];

describe('Auth guard — rotas sensíveis retornam 401', () => {
  for (const { method, path } of routes) {
    it(`${method.toUpperCase()} ${path} sem token → 401`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} com token inválido → 401`, async () => {
      const res = await request(app)[method](path)
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
    });
  }
});
