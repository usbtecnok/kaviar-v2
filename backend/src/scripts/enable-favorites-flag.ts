import { prisma } from '../lib/prisma';

async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO feature_flags (key, enabled, rollout_percentage, updated_at, created_at)
    VALUES ('passenger_favorites_matching', true, 100, NOW(), NOW())
    ON CONFLICT (key) DO UPDATE SET enabled = true, rollout_percentage = 100, updated_at = NOW()
  `);
  console.log('✅ Feature flag passenger_favorites_matching enabled (100%)');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
