import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  readMaterializationEnvironmentFromProcess,
} from '../src/services/finance/account-catalog/account-materialization-safety';

const originalDatabaseUrl =
  process.env.DATABASE_URL;

const originalMaterializationUrl =
  process.env.FINANCE_MATERIALIZATION_DATABASE_URL;

describe('exclusive materialization database URL', () => {
  beforeEach(() => {
    process.env.DATABASE_URL =
      'postgresql://user:secret@remote.example.com:5432/kaviar';

    delete process.env
      .FINANCE_MATERIALIZATION_DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL =
        originalDatabaseUrl;
    }

    if (originalMaterializationUrl === undefined) {
      delete process.env
        .FINANCE_MATERIALIZATION_DATABASE_URL;
    } else {
      process.env
        .FINANCE_MATERIALIZATION_DATABASE_URL =
          originalMaterializationUrl;
    }
  });

  it('ignora DATABASE_URL comum', () => {
    const result =
      readMaterializationEnvironmentFromProcess();

    expect(result.databaseUrl).toBeUndefined();
  });

  it('lê somente FINANCE_MATERIALIZATION_DATABASE_URL', () => {
    const localUrl =
      'postgresql://postgres:dev@127.0.0.1:5433/kaviar_finance_materialization_dev';

    process.env.FINANCE_MATERIALIZATION_DATABASE_URL =
      localUrl;

    const result =
      readMaterializationEnvironmentFromProcess();

    expect(result.databaseUrl).toBe(localUrl);
  });
});
