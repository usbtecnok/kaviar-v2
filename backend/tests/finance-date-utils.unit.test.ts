import { describe, expect, it } from 'vitest';
import { previousUtcDate } from '../src/services/finance/finance-query.service';

describe('previousUtcDate', () => {
  it('2026-07-01 → 2026-06-30', () => {
    const result = previousUtcDate(new Date('2026-07-01T00:00:00.000Z'));
    expect(result.toISOString().substring(0, 10)).toBe('2026-06-30');
  });

  it('2026-03-01 → 2026-02-28', () => {
    const result = previousUtcDate(new Date('2026-03-01T00:00:00.000Z'));
    expect(result.toISOString().substring(0, 10)).toBe('2026-02-28');
  });

  it('2024-03-01 → 2024-02-29 (ano bissexto)', () => {
    const result = previousUtcDate(new Date('2024-03-01T00:00:00.000Z'));
    expect(result.toISOString().substring(0, 10)).toBe('2024-02-29');
  });

  it('2026-01-01 → 2025-12-31', () => {
    const result = previousUtcDate(new Date('2026-01-01T00:00:00.000Z'));
    expect(result.toISOString().substring(0, 10)).toBe('2025-12-31');
  });
});
