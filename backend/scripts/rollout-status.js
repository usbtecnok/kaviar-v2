#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  const flag = await prisma.feature_flags.findUnique({
    where: { key: 'passenger_favorites_matching' }
  });
  
  const checks = await prisma.beta_monitor_checkpoints.findMany({
    where: { feature_key: 'passenger_favorites_matching' },
    orderBy: { created_at: 'desc' },
    take: 5
  });
  
  const allowlist = await prisma.feature_flag_allowlist.count({
    where: { key: 'passenger_favorites_matching' }
  });
  
  console.log('\n🎯 ROLLOUT STATUS');
  console.log('=================');
  console.log(`Enabled: ${flag.enabled}`);
  console.log(`Rollout: ${flag.rollout_percentage}%`);
  console.log(`Allowlist: ${allowlist}`);
  console.log(`Updated: ${flag.updated_at.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})}`);
  
  console.log('\n📊 ÚLTIMOS 5 CHECKPOINTS');
  console.log('========================');
  checks.forEach(c => {
    const time = new Date(c.created_at).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
    console.log(`${time} | ${c.status}`);
  });
  
  const fails = checks.filter(c => c.status === 'FAIL').length;
  const warns = checks.filter(c => c.status === 'WARN').length;
  const pass = checks.filter(c => c.status === 'PASS').length;
  
  console.log(`\n✅ PASS: ${pass} | ⚠️  WARN: ${warns} | ❌ FAIL: ${fails}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
