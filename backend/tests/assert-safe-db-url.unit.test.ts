import { describe, expect, it } from 'vitest';
import {
  SAFE_DB_URL_LOCAL_ALLOWLIST,
  assertSafeTestDatabaseUrl,
} from '../src/lib/assert-safe-db-url';

const testEnv = { nodeEnv: 'test', vitest: undefined };
const vitestEnv = { nodeEnv: undefined, vitest: 'true' };
const prodEnv = { nodeEnv: 'production', vitest: undefined };
const devEnv = { nodeEnv: 'development', vitest: undefined };

const localUrl127 = 'postgresql://user:pass@127.0.0.1:55432/db';
const localUrlLocalhost = 'postgresql://user:pass@localhost:5432/db';
const rdsUrl =
  'postgresql://user:pass@kaviar-prod.cluster-abc123.us-east-1.rds.amazonaws.com:5432/kaviardb';
const remoteUrl = 'postgresql://user:pass@remote-db.example.com:5432/db';

describe('assertSafeTestDatabaseUrl', () => {
  it('1. NODE_ENV=test + 127.0.0.1 → permitido', () => {
    expect(() => assertSafeTestDatabaseUrl(localUrl127, testEnv)).not.toThrow();
  });

  it('2. NODE_ENV=test + localhost → permitido', () => {
    expect(() => assertSafeTestDatabaseUrl(localUrlLocalhost, testEnv)).not.toThrow();
  });

  it('3. VITEST=true + host local → permitido', () => {
    expect(() => assertSafeTestDatabaseUrl(localUrl127, vitestEnv)).not.toThrow();
  });

  it('4. NODE_ENV=test + host RDS → bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl(rdsUrl, testEnv)).toThrow('[kaviar-safety]');
  });

  it('5. NODE_ENV=test + host remoto genérico → bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl(remoteUrl, testEnv)).toThrow('[kaviar-safety]');
  });

  it('6. NODE_ENV=test + DATABASE_URL ausente → bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl(undefined, testEnv)).toThrow('[kaviar-safety]');
  });

  it('7. NODE_ENV=test + URL inválida → bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl('not-a-valid-url', testEnv)).toThrow(
      '[kaviar-safety]',
    );
  });

  it('8. NODE_ENV=production + host RDS → não bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl(rdsUrl, prodEnv)).not.toThrow();
  });

  it('9. ambiente de desenvolvimento sem flags de teste → não bloqueado', () => {
    expect(() => assertSafeTestDatabaseUrl(remoteUrl, devEnv)).not.toThrow();
  });

  it('10. mensagem de erro não contém senha nem URL completa', () => {
    const password = 's3cr3t-prod-password';
    const url = `postgresql://dbadmin:${password}@remote-host.example.com:5432/kaviar`;

    let errorMessage = '';
    try {
      assertSafeTestDatabaseUrl(url, testEnv);
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    expect(errorMessage).not.toContain(password);
    expect(errorMessage).not.toContain(url);
    expect(errorMessage).toContain('remote-host.example.com');
  });

  it('allowlist contains exactly the expected local hosts', () => {
    // '[::1]' with brackets: new URL().hostname returns them for IPv6 literals
    expect(SAFE_DB_URL_LOCAL_ALLOWLIST).toEqual(['127.0.0.1', 'localhost', '[::1]']);
  });

  it('IPv6 ::1 → permitido', () => {
    expect(() =>
      assertSafeTestDatabaseUrl('postgresql://user:pass@[::1]:5432/db', testEnv),
    ).not.toThrow();
  });

  // --- Tests A-I: VITEST env var parsing and setup guard ---

  it('A. VITEST="true" ativa proteção → host remoto bloqueado', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: undefined, vitest: 'true' }),
    ).toThrow('[kaviar-safety]');
  });

  it('B. VITEST="1" ativa proteção → host remoto bloqueado', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: undefined, vitest: '1' }),
    ).toThrow('[kaviar-safety]');
  });

  it('C. VITEST="false" sozinho não ativa proteção → host remoto permitido', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: undefined, vitest: 'false' }),
    ).not.toThrow();
  });

  it('D. VITEST="0" sozinho não ativa proteção → host remoto permitido', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: undefined, vitest: '0' }),
    ).not.toThrow();
  });

  it('E. NODE_ENV=test ativa proteção independentemente de VITEST ausente', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: 'test', vitest: undefined }),
    ).toThrow('[kaviar-safety]');
  });

  it('F. VITEST="true" + host local → permitido (ativação correta não bloqueia local)', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(localUrl127, { nodeEnv: undefined, vitest: 'true' }),
    ).not.toThrow();
  });

  it('G. VITEST="1" + host local → permitido', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(localUrlLocalhost, { nodeEnv: undefined, vitest: '1' }),
    ).not.toThrow();
  });

  it('H. NODE_ENV=production + sem VITEST → host remoto não bloqueado', () => {
    expect(() =>
      assertSafeTestDatabaseUrl(rdsUrl, { nodeEnv: 'production', vitest: undefined }),
    ).not.toThrow();
  });

  it('I. mensagem de erro não contém usuário, senha ou URL completa', () => {
    const user = 'admin-user';
    const password = 'ultra-secret-password';
    const url = `postgresql://${user}:${password}@prod-host.internal.com:5432/kaviar`;

    let errorMessage = '';
    try {
      assertSafeTestDatabaseUrl(url, testEnv);
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    expect(errorMessage).not.toContain(user);
    expect(errorMessage).not.toContain(password);
    expect(errorMessage).not.toContain(url);
    expect(errorMessage).toContain('prod-host.internal.com');
  });
});
