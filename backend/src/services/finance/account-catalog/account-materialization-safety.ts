export interface MaterializationEnvironmentInput {
  nodeEnv?: string;
  databaseUrl?: string;
  allowMaterialization?: string;
}

export interface MaterializationDatabaseIdentity {
  protocol: string;
  host: string;
  port: string;
  database: string;
  node_env: string;
}

export interface MaterializationSafetyResult {
  ok: boolean;
  errors: string[];
  database: MaterializationDatabaseIdentity | null;
}

const ALLOWED_NODE_ENVS = new Set(['development', 'test']);
const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ALLOWED_DATABASE_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function extractDatabaseName(url: URL): string {
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  return pathname.split('/')[0] ?? '';
}

export function validateMaterializationEnvironment(
  input: MaterializationEnvironmentInput,
): MaterializationSafetyResult {
  const errors: string[] = [];
  const nodeEnv = input.nodeEnv?.trim() ?? '';

  if (input.allowMaterialization !== 'true') {
    errors.push(
      'ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION deve ser exatamente true',
    );
  }

  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    errors.push('NODE_ENV deve ser development ou test');
  }

  if (!input.databaseUrl) {
    errors.push('FINANCE_MATERIALIZATION_DATABASE_URL é obrigatória');
    return {
      ok: false,
      errors,
      database: null,
    };
  }

  let parsed: URL;

  try {
    parsed = new URL(input.databaseUrl);
  } catch {
    errors.push('DATABASE_URL inválida');
    return {
      ok: false,
      errors,
      database: null,
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  const host = normalizeHostname(parsed.hostname);
  const port = parsed.port || '5432';
  const database = extractDatabaseName(parsed);

  if (!ALLOWED_DATABASE_PROTOCOLS.has(protocol)) {
    errors.push('DATABASE_URL deve usar postgres ou postgresql');
  }

  if (!ALLOWED_LOCAL_HOSTS.has(host)) {
    errors.push('host do banco deve ser estritamente local');
  }

  if (!/(^|[_-])(dev|test)([_-]|$)/i.test(database)) {
    errors.push('nome do banco deve identificar ambiente dev ou test');
  }

  return {
    ok: errors.length === 0,
    errors,
    database: {
      protocol,
      host,
      port,
      database,
      node_env: nodeEnv,
    },
  };
}

export function assertMaterializationEnvironment(
  input: MaterializationEnvironmentInput,
): MaterializationDatabaseIdentity {
  const result = validateMaterializationEnvironment(input);

  if (!result.ok || !result.database) {
    throw new Error(
      [
        'Materialização financeira recusada por segurança.',
        ...result.errors.map((error) => `- ${error}`),
      ].join('\n'),
    );
  }

  return result.database;
}

export function readMaterializationEnvironmentFromProcess():
  MaterializationEnvironmentInput {
  return {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl:
      process.env.FINANCE_MATERIALIZATION_DATABASE_URL,
    allowMaterialization:
      process.env.ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION,
  };
}
