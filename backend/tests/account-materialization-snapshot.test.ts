import { describe, expect, it } from 'vitest';

import {
  buildExistingFinancialCatalogSnapshot,
} from '../src/services/finance/account-catalog/account-materialization-snapshot';

describe('account materialization snapshot', () => {
  it('converte registros do Prisma para o formato do planejador', () => {
    const snapshot = buildExistingFinancialCatalogSnapshot({
      accounts: [
        {
          code: '1101',
          name: 'Bank - Operational',
          type: 'BANK',
          currency: 'BRL',
        },
      ],
      categories: [
        {
          code: '3103',
          name: 'Revenue Adjustment',
          kind: 'REVENUE',
          parent: { code: 'RECEITAS_OPERACIONAIS' },
          default_direction: 'IN',
          is_postable: true,
        },
      ],
      cost_centers: [
        {
          code: 'CC001',
          name: 'Corporate',
          type: 'COMPANY',
          parent: null,
        },
      ],
    });

    expect(snapshot).toEqual({
      accounts: [
        {
          code: '1101',
          name: 'Bank - Operational',
          type: 'BANK',
          currency: 'BRL',
        },
      ],
      categories: [
        {
          code: '3103',
          name: 'Revenue Adjustment',
          kind: 'REVENUE',
          parent_code: 'RECEITAS_OPERACIONAIS',
          default_direction: 'IN',
          is_postable: true,
        },
      ],
      cost_centers: [
        {
          code: 'CC001',
          name: 'Corporate',
          type: 'COMPANY',
          parent_code: null,
        },
      ],
    });
  });

  it('preserva catálogos vazios', () => {
    expect(
      buildExistingFinancialCatalogSnapshot({
        accounts: [],
        categories: [],
        cost_centers: [],
      }),
    ).toEqual({
      accounts: [],
      categories: [],
      cost_centers: [],
    });
  });
});
