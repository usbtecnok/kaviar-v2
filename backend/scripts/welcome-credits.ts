/**
 * Welcome credits for active/approved drivers.
 * Idempotent: uses welcome_{driverId} as idempotency key.
 *
 * Usage:
 *   cd backend && DATABASE_URL="..." npx tsx scripts/welcome-credits.ts
 *   cd backend && DATABASE_URL="..." npx tsx scripts/welcome-credits.ts --dry-run
 */
import { pool } from '../src/db';
import { applyCreditDelta } from '../src/services/credit.service';

const WELCOME_AMOUNT = 50;
const REASON = 'welcome_credits';
const dryRun = process.argv.includes('--dry-run');

async function run() {
  const { rows: drivers } = await pool.query(
    `SELECT id, name FROM drivers WHERE status IN ('approved', 'active')`
  );

  console.log(`Found ${drivers.length} active/approved drivers. dry_run=${dryRun}`);
  console.log('');

  let credited = 0;
  let skipped = 0;

  for (const d of drivers) {
    const key = `welcome_${d.id}`;

    if (dryRun) {
      console.log(`  [DRY] ${d.name} (${d.id}) → would receive ${WELCOME_AMOUNT} credits`);
      credited++;
      continue;
    }

    const result = await applyCreditDelta(d.id, WELCOME_AMOUNT, REASON, 'system', key);

    if (result.alreadyProcessed) {
      console.log(`  [SKIP] ${d.name} (${d.id}) → already has welcome credits (balance=${result.balance})`);
      skipped++;
    } else {
      console.log(`  [OK]   ${d.name} (${d.id}) → +${WELCOME_AMOUNT} credits (balance=${result.balance})`);
      credited++;
    }
  }

  console.log('');
  console.log(`Done. credited=${credited} skipped=${skipped} total=${drivers.length}`);
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
