#!/usr/bin/env node
/**
 * Rollout Update Script - Run inside ECS container
 * Usage: node update-rollout.js <feature_key> <rollout_percentage>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEATURE_KEY = process.argv[2] || 'passenger_favorites_matching';
const ROLLOUT = parseInt(process.argv[3] || '1');

async function main() {
  console.log(`[Rollout] Updating ${FEATURE_KEY} to ${ROLLOUT}%`);
  
  // Get before state
  const before = await prisma.feature_flags.findUnique({
    where: { key: FEATURE_KEY },
  });
  
  if (!before) {
    console.error(`[Rollout] Feature flag ${FEATURE_KEY} not found`);
    process.exit(1);
  }
  
  console.log(`[Rollout] Before: enabled=${before.enabled}, rollout=${before.rollout_percentage}%`);
  
  // Update
  const after = await prisma.feature_flags.update({
    where: { key: FEATURE_KEY },
    data: {
      rollout_percentage: ROLLOUT,
      updated_at: new Date(),
    },
  });
  
  console.log(`[Rollout] After: enabled=${after.enabled}, rollout=${after.rollout_percentage}%`);
  console.log(`[Rollout] ✅ Rollout updated successfully`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('[Rollout] Error:', error);
  process.exit(1);
});
