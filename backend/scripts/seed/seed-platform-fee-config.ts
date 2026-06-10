/**
 * Seed: platform_fee_configs — initial 18% rate for shadow mode.
 *
 * Environment variables:
 *   CREATOR_ID      — SUPER_ADMIN who proposes (required)
 *   APPROVER_ID     — SUPER_ADMIN who approves (required unless SINGLE_ADMIN_EXCEPTION)
 *   ACTIVATION_DATE — ISO timestamp for effective_from (must be in the future)
 *   SINGLE_ADMIN_EXCEPTION — 'true' to allow self-approval (audit-logged)
 *
 * This config enables shadow calculations ONLY. It is NOT a go-live
 * of the wallet system. The effective_from date determines from when
 * the shadow calculator can resolve a valid fee config.
 *
 * Usage:
 *   CREATOR_ID=xxx APPROVER_ID=yyy ACTIVATION_DATE=2026-06-15T00:00:00-03:00 \
 *     npx tsx scripts/seed/seed-platform-fee-config.ts
 */
import { pool } from '../../src/db';

async function main() {
  const creatorId = process.env.CREATOR_ID;
  const approverId = process.env.APPROVER_ID;
  const activationDate = process.env.ACTIVATION_DATE;
  const singleException = process.env.SINGLE_ADMIN_EXCEPTION === 'true';

  if (!creatorId || !activationDate) {
    console.error('Required: CREATOR_ID, ACTIVATION_DATE');
    console.error('Optional: APPROVER_ID or SINGLE_ADMIN_EXCEPTION=true');
    process.exit(1);
  }

  const effectiveFrom = new Date(activationDate);
  if (isNaN(effectiveFrom.getTime())) {
    console.error('Invalid ACTIVATION_DATE format. Use ISO 8601.');
    process.exit(1);
  }
  if (effectiveFrom.getTime() <= Date.now()) {
    console.error('ACTIVATION_DATE must be in the future. Shadow config is not a retroactive go-live.');
    process.exit(1);
  }

  const creator = await pool.query(
    `SELECT id, role FROM admins WHERE id = $1 AND role = 'SUPER_ADMIN' AND is_active = true`, [creatorId]
  );
  if (!creator.rows[0]) { console.error('Creator not found or not active SUPER_ADMIN'); process.exit(1); }

  let finalApproverId: string;
  let changeReason: string;

  if (approverId && approverId !== creatorId) {
    const approver = await pool.query(
      `SELECT id FROM admins WHERE id = $1 AND role = 'SUPER_ADMIN' AND is_active = true`, [approverId]
    );
    if (!approver.rows[0]) { console.error('Approver not found or not active SUPER_ADMIN'); process.exit(1); }
    finalApproverId = approverId;
    changeReason = 'Taxa inicial KAVIAR 18% — shadow mode config';
  } else if (singleException) {
    finalApproverId = creatorId;
    changeReason = 'Taxa inicial KAVIAR 18% — shadow mode [SELF_APPROVED: single SUPER_ADMIN exception, requires formal audit]';
    console.warn('⚠️  Self-approval: single SUPER_ADMIN exception. Logged for audit.');
  } else {
    console.error('APPROVER_ID must differ from CREATOR_ID. Use SINGLE_ADMIN_EXCEPTION=true if only one admin.');
    process.exit(1);
  }

  const existing = await pool.query(
    `SELECT id FROM platform_fee_configs WHERE approval_status = 'approved' LIMIT 1`
  );
  if (existing.rows[0]) {
    console.log('Already seeded:', existing.rows[0].id);
    await pool.end();
    process.exit(0);
  }

  const { rows } = await pool.query(
    `INSERT INTO platform_fee_configs
      (platform_fee_percent, effective_from, approval_status, change_reason, created_by, approved_by, approved_at)
     VALUES (18.00, $1, 'approved', $2, $3, $4, NOW())
     RETURNING id, effective_from`,
    [effectiveFrom, changeReason, creatorId, finalApproverId]
  );

  console.log(`✅ Seeded platform_fee_configs:`);
  console.log(`   id: ${rows[0].id}`);
  console.log(`   effective_from: ${rows[0].effective_from}`);
  console.log(`   purpose: shadow mode calculation reference (NOT go-live)`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
