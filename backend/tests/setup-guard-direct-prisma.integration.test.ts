import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VITEST_BIN = resolve(BACKEND_DIR, 'node_modules/.bin/vitest');
const FIXTURE = 'tests/fixtures/direct-prisma-client.fixture.ts';

describe('setupFiles blocks direct PrismaClient import before module evaluation', () => {
  it(
    'blocks fixture with remote DATABASE_URL — [FIXTURE_MODULE_EVALUATED] never printed, [kaviar-safety] thrown',
    () => {
      const user = 'fixtureuser';
      const password = 'fixturepwd';
      const remoteUrl = `postgresql://${user}:${password}@blocked.example.invalid:5432/db`;

      const result = spawnSync(
        VITEST_BIN,
        ['run', '--config', 'tests/fixtures/vitest.fixture.config.ts'],
        {
        cwd: BACKEND_DIR,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_URL: remoteUrl,
        },
        encoding: 'utf8',
        timeout: 30_000,
      });

      const output = (result.stdout ?? '') + (result.stderr ?? '');

      // Guard must have fired — process exits with failure
      expect(result.status).not.toBe(0);

      // Guard tag present in output
      expect(output).toContain('[kaviar-safety]');

      // Module was never evaluated — marker is absent
      expect(output).not.toContain('[FIXTURE_MODULE_EVALUATED]');

      // No credentials in output
      expect(output).not.toContain(user);
      expect(output).not.toContain(password);
      expect(output).not.toContain(remoteUrl);
    },
    20_000,
  );
});
