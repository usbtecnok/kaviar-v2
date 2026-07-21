import { describe, expect, it } from 'vitest';

import {
  assertMaterializationEnvironment,
  validateMaterializationEnvironment,
} from '../src/services/finance/account-catalog/account-materialization-safety';

const localDev = {
  nodeEnv: 'development',
  databaseUrl: 'postgresql://u:p@localhost:5433/kaviar_dev',
  allowMaterialization: 'true',
};

describe('account materialization safety', () => {
  it('aceita ambiente local autorizado', () => {
    const result = validateMaterializationEnvironment(localDev);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.database).toMatchObject({
      host: 'localhost',
      database: 'kaviar_dev',
      node_env: 'development',
    });
  });

  it('recusa produção em múltiplas camadas', () => {
    const result = validateMaterializationEnvironment({
      nodeEnv: 'production',
      databaseUrl: 'postgresql://u:p@prod.example.com:5432/kaviar',
      allowMaterialization: 'true',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('NODE_ENV deve ser development ou test');
    expect(result.errors).toContain(
      'host do banco deve ser estritamente local',
    );
    expect(result.errors).toContain(
      'nome do banco deve identificar ambiente dev ou test',
    );
  });

  it('recusa hostname parecido com localhost', () => {
    const result = validateMaterializationEnvironment({
      ...localDev,
      databaseUrl:
        'postgresql://u:p@localhost.example.com:5432/kaviar_test',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'host do banco deve ser estritamente local',
    );
  });

  it('recusa banco local sem marcador dev ou test', () => {
    const result = validateMaterializationEnvironment({
      ...localDev,
      databaseUrl: 'postgresql://u:p@localhost:5432/kaviar',
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      'nome do banco deve identificar ambiente dev ou test',
    );
  });

  it('exige autorização exatamente igual a true', () => {
    for (const value of [undefined, 'TRUE', '1']) {
      const result = validateMaterializationEnvironment({
        ...localDev,
        allowMaterialization: value,
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContain(
        'ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION deve ser exatamente true',
      );
    }
  });

  it('não expõe credenciais na mensagem de erro', () => {
    const action = () =>
      assertMaterializationEnvironment({
        nodeEnv: 'production',
        databaseUrl:
          'postgresql://admin:SENHA_SUPER_SECRETA@prod.example.com:5432/kaviar',
        allowMaterialization: 'true',
      });

    expect(action).toThrow(
      'Materialização financeira recusada por segurança.',
    );

    try {
      action();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      expect(message).not.toContain('SENHA_SUPER_SECRETA');
      expect(message).not.toContain('admin');
      expect(message).not.toContain('prod.example.com');
    }
  });
});
