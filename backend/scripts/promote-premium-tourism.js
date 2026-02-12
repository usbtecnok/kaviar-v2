#!/usr/bin/env node

/**
 * CLI Runner: Premium Tourism Promoter
 * 
 * Promove drivers para Premium Tourism após 6 meses de aprovação
 * 
 * Usage:
 *   node dist/scripts/promote-premium-tourism.js [--dry-run] [--limit N]
 * 
 * Examples:
 *   node dist/scripts/promote-premium-tourism.js --dry-run
 *   node dist/scripts/promote-premium-tourism.js --limit 10
 *   node dist/scripts/promote-premium-tourism.js
 */

const { promotePremiumTourism } = require('../services/premium-tourism-promoter');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : undefined;

  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'info',
    service: 'premium-tourism-promoter',
    action: 'start',
    dryRun,
    limit: limit || 'unlimited'
  }));

  try {
    const result = await promotePremiumTourism({ dryRun, limit });

    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'premium-tourism-promoter',
      action: 'complete',
      result
    }));

    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'premium-tourism-promoter',
      action: 'failed',
      error: error.message,
      stack: error.stack
    }));

    process.exit(1);
  }
}

main();
