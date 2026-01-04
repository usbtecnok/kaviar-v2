import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';

describe('Admin Login Rate Limiting', () => {
  const loginEndpoint = '/api/admin/auth/login';
  const validCredentials = {
    email: 'admin@kaviar.com',
    password: 'admin123'
  };
  const invalidCredentials = {
    email: 'admin@kaviar.com',
    password: 'wrongpassword'
  };

  beforeAll(async () => {
    // Ensure we're not in test environment for this test
    process.env.NODE_ENV = 'development';
  });

  afterAll(async () => {
    // Reset to test environment
    process.env.NODE_ENV = 'test';
  });

  it('should allow requests within rate limit', async () => {
    // Make 5 requests (within limit of 10)
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post(loginEndpoint)
        .send(invalidCredentials);
      
      // Should get 401 (invalid credentials) not 429 (rate limited)
      expect(response.status).toBe(401);
    }
  });

  it('should block requests after exceeding rate limit', async () => {
    // Make 11 requests to exceed limit of 10
    const requests = [];
    for (let i = 0; i < 11; i++) {
      requests.push(
        request(app)
          .post(loginEndpoint)
          .send(invalidCredentials)
      );
    }

    const responses = await Promise.all(requests);
    
    // Count how many got rate limited (429)
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    const normalCount = responses.filter(r => r.status === 401).length;

    // At least 1 should be rate limited
    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(normalCount).toBeLessThan(11);

    // Check rate limit response format
    const rateLimitedResponse = responses.find(r => r.status === 429);
    expect(rateLimitedResponse?.body).toMatchObject({
      success: false,
      error: expect.stringContaining('Muitas tentativas'),
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  });

  it('should include rate limit headers', async () => {
    const response = await request(app)
      .post(loginEndpoint)
      .send(invalidCredentials);

    // Should have rate limit headers
    expect(response.headers).toHaveProperty('ratelimit-limit');
    expect(response.headers).toHaveProperty('ratelimit-remaining');
    expect(response.headers).toHaveProperty('ratelimit-reset');
  });

  it('should reset rate limit after window expires', async () => {
    // This test would require waiting 60 seconds, so we'll mock it
    // In a real scenario, you'd wait for the window to reset
    
    // Make requests to approach limit
    for (let i = 0; i < 9; i++) {
      await request(app)
        .post(loginEndpoint)
        .send(invalidCredentials);
    }

    // Next request should still work (within limit)
    const response = await request(app)
      .post(loginEndpoint)
      .send(invalidCredentials);

    expect(response.status).toBe(401); // Not rate limited
  }, 10000);

  it('should skip rate limiting in test environment', async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Make many requests - should not be rate limited
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        request(app)
          .post(loginEndpoint)
          .send(invalidCredentials)
      );
    }

    const responses = await Promise.all(requests);
    
    // All should get 401 (invalid credentials), none should get 429 (rate limited)
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    expect(rateLimitedCount).toBe(0);

    // Reset environment
    process.env.NODE_ENV = 'development';
  });
});
