#!/usr/bin/env node

/**
 * Script para limpar duplicatas de communities sem geofence
 * Mantém apenas os registros com Polygon/MultiPolygon para Botafogo, Tijuca e Glória
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_COMMUNITIES = ['Botafogo', 'Tijuca', 'Glória'];

const EXPECTED_IDS = {
  'Botafogo': 'cmk6ux02j0011qqr398od1msm',
  'Tijuca': 'cmk6ux8fk001rqqr371kc4ple', 
  'Glória': 'cmk6uwq9u0007qqr3pxqr64ce'
};

async function main() {
  console.log('🧹 KAVIAR - Purge Broken Geofences');
  console.log('=====================================');

  for (const communityName of TARGET_COMMUNITIES) {
    console.log(`\n🔍 Processando: ${communityName}`);
    
    // Buscar todas as communities com esse nome
    const communities = await prisma.community.findMany({
      where: { name: communityName },
      include: { geofenceData: true }
    });

    console.log(`  📊 Encontradas ${communities.length} communities`);

    if (communities.length <= 1) {
      console.log(`  ✅ Sem duplicatas para ${communityName}`);
      continue;
    }

    // Classificar por qualidade de geofence
    const classified = communities.map(community => {
      let priority = 0;
      let type = 'SEM_DADOS';

      if (community.geofenceData?.geojson) {
        try {
          const geojson = JSON.parse(community.geofenceData.geojson);
          type = geojson.type;
          
          if (type === 'Polygon' || type === 'MultiPolygon') priority = 3;
          else if (type === 'Point') priority = 2;
          else priority = 1;
        } catch (e) {
          priority = 0;
        }
      }

      return { ...community, priority, type };
    });

    // Ordenar por prioridade (melhor primeiro)
    classified.sort((a, b) => b.priority - a.priority);

    const keeper = classified[0];
    const toDelete = classified.slice(1);

    console.log(`  ✅ Mantendo: ${keeper.id} (${keeper.type})`);
    console.log(`  🗑️  Deletando: ${toDelete.length} duplicatas`);

    // Verificar se o ID mantido é o esperado
    const expectedId = EXPECTED_IDS[communityName];
    if (expectedId && keeper.id !== expectedId) {
      console.log(`  ⚠️  AVISO: ID mantido ${keeper.id} != esperado ${expectedId}`);
    } else if (expectedId) {
      console.log(`  ✅ ID correto mantido: ${expectedId}`);
    }

    // Deletar duplicatas
    for (const duplicate of toDelete) {
      console.log(`    🗑️ Deletando: ${duplicate.id} (${duplicate.type})`);
      
      // Deletar geofenceData primeiro (FK constraint)
      if (duplicate.geofenceData) {
        await prisma.geofenceData.delete({
          where: { communityId: duplicate.id }
        });
      }
      
      // Deletar community
      await prisma.community.delete({
        where: { id: duplicate.id }
      });
    }
  }

  console.log('\n✅ Limpeza concluída!');
  console.log('\n🔍 Verificação final:');
  
  // Verificar resultado final
  for (const communityName of TARGET_COMMUNITIES) {
    const remaining = await prisma.community.findMany({
      where: { name: communityName },
      include: { geofenceData: true }
    });

    if (remaining.length === 1) {
      const community = remaining[0];
      let type = 'SEM_DADOS';
      
      if (community.geofenceData?.geojson) {
        try {
          const geojson = JSON.parse(community.geofenceData.geojson);
          type = geojson.type;
        } catch (e) {
          type = 'INVALID';
        }
      }
      
      console.log(`  ✅ ${communityName}: ${community.id} (${type})`);
    } else {
      console.log(`  ❌ ${communityName}: ${remaining.length} registros (esperado: 1)`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
