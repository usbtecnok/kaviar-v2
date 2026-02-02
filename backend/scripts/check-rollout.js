#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const checkpoints = await prisma.beta_monitor_checkpoints.findMany({
      where: { feature_key: 'passenger_favorites_matching' },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        created_at: true,
        status: true,
        config_json: true
      }
    });

    console.log('\n📊 ÚLTIMOS CHECKPOINTS:\n');
    
    const at5pct = checkpoints.filter(c => {
      const config = typeof c.config_json === 'string' ? JSON.parse(c.config_json) : c.config_json;
      return config.rollout_percentage === 5;
    });

    checkpoints.slice(0, 5).forEach(c => {
      const config = typeof c.config_json === 'string' ? JSON.parse(c.config_json) : c.config_json;
      const time = new Date(c.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      console.log(`${time} | Rollout: ${config.rollout_percentage}% | Status: ${c.status}`);
    });

    console.log(`\n✅ Checkpoints em 5%: ${at5pct.length}`);
    
    if (at5pct.length >= 2) {
      console.log('✅ GO: Pode avançar para 10%');
    } else {
      console.log('⚠️  NO-GO: Aguardar mais checkpoints');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
