/**
 * Women Matching Consent Service — Transacional, idempotente
 *
 * Responsabilidade:
 *   Gerenciar opt-in/opt-out de passageiras e motoristas para a funcionalidade
 *   de preferência por motorista mulher, com trilha histórica.
 *
 * Não altera: dispatcher, rides, créditos, pricing, push, localização.
 */

import { pool } from '../db';

// --- Types ---

type ActorType = 'passenger' | 'driver';
type ConsentAction = 'opt_in' | 'opt_out' | 'default_preference_enabled' | 'default_preference_disabled';

interface OptInResult {
  changed: boolean;
  opt_in: boolean;
  consent_version: string | null;
}

interface OptOutResult {
  changed: boolean;
  opt_in: boolean;
}

interface DefaultResult {
  changed: boolean;
  prefer_woman_driver_default: boolean;
}

// --- Helpers ---

function getTable(actorType: ActorType): string {
  return actorType === 'passenger' ? 'passengers' : 'drivers';
}

async function insertEvent(
  client: any,
  actorType: ActorType,
  actorId: string,
  action: ConsentAction,
  consentVersion?: string | null,
  metadata?: any
): Promise<void> {
  await client.query(
    `INSERT INTO women_matching_consent_events (actor_type, actor_id, action, consent_version, source, metadata)
     VALUES ($1, $2, $3, $4, 'api', $5)`,
    [actorType, actorId, action, consentVersion || null, metadata ? JSON.stringify(metadata) : null]
  );
}

// --- Public API ---

/**
 * Opt-in: ativa participação. Idempotente com mesma versão.
 */
export async function optIn(
  actorType: ActorType,
  actorId: string,
  consentVersion: string
): Promise<OptInResult> {
  const table = getTable(actorType);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ler estado atual com lock de linha
    const current = await client.query(
      `SELECT women_matching_opt_in, women_matching_consent_version FROM ${table} WHERE id = $1 FOR UPDATE`,
      [actorId]
    );

    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error('NOT_FOUND');
    }

    const row = current.rows[0];

    // Idempotente: já ativo com mesma versão → noop
    if (row.women_matching_opt_in === true && row.women_matching_consent_version === consentVersion) {
      await client.query('ROLLBACK');
      return { changed: false, opt_in: true, consent_version: consentVersion };
    }

    // Atualizar
    await client.query(
      `UPDATE ${table} SET
        women_matching_opt_in = true,
        women_matching_opted_in_at = NOW(),
        women_matching_opted_out_at = NULL,
        women_matching_consent_version = $2
       WHERE id = $1`,
      [actorId, consentVersion]
    );

    // Evento
    await insertEvent(client, actorType, actorId, 'opt_in', consentVersion, {
      previous_opt_in: row.women_matching_opt_in,
      previous_version: row.women_matching_consent_version,
    });

    await client.query('COMMIT');
    return { changed: true, opt_in: true, consent_version: consentVersion };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Opt-out: desativa participação e preferência padrão. Idempotente.
 */
export async function optOut(
  actorType: ActorType,
  actorId: string
): Promise<OptOutResult> {
  const table = getTable(actorType);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT women_matching_opt_in FROM ${table} WHERE id = $1 FOR UPDATE`,
      [actorId]
    );

    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error('NOT_FOUND');
    }

    // Idempotente: já inativo → noop
    if (current.rows[0].women_matching_opt_in === false) {
      await client.query('ROLLBACK');
      return { changed: false, opt_in: false };
    }

    // Atualizar (passageira também zera prefer_default)
    const extraFields = actorType === 'passenger' ? ', prefer_woman_driver_default = false' : '';
    await client.query(
      `UPDATE ${table} SET
        women_matching_opt_in = false,
        women_matching_opted_out_at = NOW()
        ${extraFields}
       WHERE id = $1`,
      [actorId]
    );

    await insertEvent(client, actorType, actorId, 'opt_out');

    await client.query('COMMIT');
    return { changed: true, opt_in: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Altera preferência padrão da passageira. Exige opt-in ativo.
 */
export async function setDefaultPreference(
  passengerId: string,
  preferDefault: boolean
): Promise<DefaultResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT women_matching_opt_in, prefer_woman_driver_default FROM passengers WHERE id = $1 FOR UPDATE`,
      [passengerId]
    );

    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error('NOT_FOUND');
    }

    if (!current.rows[0].women_matching_opt_in) {
      await client.query('ROLLBACK');
      throw new Error('OPT_IN_REQUIRED');
    }

    // Idempotente: mesmo valor → noop
    if (current.rows[0].prefer_woman_driver_default === preferDefault) {
      await client.query('ROLLBACK');
      return { changed: false, prefer_woman_driver_default: preferDefault };
    }

    await client.query(
      `UPDATE passengers SET prefer_woman_driver_default = $2 WHERE id = $1`,
      [passengerId, preferDefault]
    );

    const action: ConsentAction = preferDefault ? 'default_preference_enabled' : 'default_preference_disabled';
    await insertEvent(client, 'passenger', passengerId, action);

    await client.query('COMMIT');
    return { changed: true, prefer_woman_driver_default: preferDefault };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Consulta estado atual (passageira ou motorista).
 */
export async function getStatus(actorType: ActorType, actorId: string) {
  const table = getTable(actorType);
  const baseFields = 'women_matching_opt_in, women_matching_opted_in_at, women_matching_opted_out_at, women_matching_consent_version, women_preference_eligible, women_preference_eligible_at, women_preference_eligibility_source, women_preference_eligibility_revoked_at';
  const extraFields = actorType === 'passenger' ? ', prefer_woman_driver_default' : '';

  const result = await pool.query(`SELECT ${baseFields}${extraFields} FROM ${table} WHERE id = $1`, [actorId]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    ...row,
    participating: row.women_preference_eligible && row.women_matching_opt_in,
  };
}

/**
 * Declara elegibilidade (self_attestation). Idempotente.
 */
export async function declareEligibility(actorType: ActorType, actorId: string, consentVersion: string) {
  const table = getTable(actorType);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT women_preference_eligible FROM ${table} WHERE id = $1 FOR UPDATE`,
      [actorId]
    );
    if (!current.rows[0]) { await client.query('ROLLBACK'); return { changed: false, error: 'not_found' }; }
    if (current.rows[0].women_preference_eligible) { await client.query('ROLLBACK'); return { changed: false, eligible: true }; }

    await client.query(
      `UPDATE ${table} SET women_preference_eligible = true, women_preference_eligible_at = NOW(), women_preference_eligibility_source = 'self_attestation', women_preference_eligibility_revoked_at = NULL WHERE id = $1`,
      [actorId]
    );

    await client.query(
      `INSERT INTO women_matching_consent_events (actor_type, actor_id, action, consent_version, source) VALUES ($1, $2, 'eligibility_declared', $3, 'api')`,
      [actorType, actorId, consentVersion]
    );

    await client.query('COMMIT');
    return { changed: true, eligible: true, source: 'self_attestation' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Revoga elegibilidade. Cascata: opt_in=false, prefer_default=false. Idempotente.
 */
export async function revokeEligibility(actorType: ActorType, actorId: string) {
  const table = getTable(actorType);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT women_preference_eligible FROM ${table} WHERE id = $1 FOR UPDATE`,
      [actorId]
    );
    if (!current.rows[0]) { await client.query('ROLLBACK'); return { changed: false, error: 'not_found' }; }
    if (!current.rows[0].women_preference_eligible) { await client.query('ROLLBACK'); return { changed: false, eligible: false }; }

    const cascadeFields = actorType === 'passenger'
      ? ', women_matching_opt_in = false, prefer_woman_driver_default = false'
      : ', women_matching_opt_in = false';

    await client.query(
      `UPDATE ${table} SET women_preference_eligible = false, women_preference_eligibility_revoked_at = NOW()${cascadeFields} WHERE id = $1`,
      [actorId]
    );

    await client.query(
      `INSERT INTO women_matching_consent_events (actor_type, actor_id, action, source) VALUES ($1, $2, 'eligibility_revoked', 'api')`,
      [actorType, actorId]
    );

    await client.query('COMMIT');
    return { changed: true, eligible: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Guard: verifica elegibilidade antes de permitir opt-in.
 */
export async function checkEligibility(actorType: ActorType, actorId: string): Promise<boolean> {
  const table = getTable(actorType);
  const result = await pool.query(`SELECT women_preference_eligible FROM ${table} WHERE id = $1`, [actorId]);
  return result.rows[0]?.women_preference_eligible === true;
}
