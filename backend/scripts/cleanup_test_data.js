const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function analyzeTestData() {
  console.log('🔍 Analisando dados de teste para limpeza...');
  
  // Buscar comunidades suspeitas (fora do RJ ou com nomes de teste)
  const communities = await prisma.community.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          drivers: true,
          passengers: true,
          guides: true
        }
      }
    }
  });
  
  const testDataCandidates = [];
  const rjCommunities = [];
  
  // Critérios para identificar dados de teste
  const testPatterns = [
    /tambau/i,
    /sp$/i,
    /minas gerais/i,
    /salvador/i,
    /bahia/i,
    /rio grande do sul/i,
    /^butui$/i,
    /^tijuacu$/i,
    /^agricola$/i,
    /mata machado/i
  ];
  
  communities.forEach(community => {
    const isTestData = testPatterns.some(pattern => 
      pattern.test(community.name) || 
      (community.description && pattern.test(community.description))
    );
    
    const hasDependencies = 
      community._count.drivers > 0 || 
      community._count.passengers > 0 || 
      community._count.guides > 0;
    
    if (isTestData) {
      testDataCandidates.push({
        id: community.id,
        name: community.name,
        description: community.description,
        createdAt: community.createdAt,
        dependencies: {
          drivers: community._count.drivers,
          passengers: community._count.passengers,
          guides: community._count.guides
        },
        hasDependencies,
        reason: 'Nome/descrição indica dados de teste fora do RJ'
      });
    } else {
      rjCommunities.push(community);
    }
  });
  
  // Gerar relatório
  const reportPath = path.join(__dirname, '..', '..', 'audit', 'cleanup_test_data_report.md');
  
  let report = '# Relatório de Limpeza - Dados de Teste\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Total analisado:** ${communities.length}\n`;
  report += `**Candidatos para limpeza:** ${testDataCandidates.length}\n`;
  report += `**Comunidades RJ válidas:** ${rjCommunities.length}\n\n`;
  
  report += '## Candidatos para Limpeza\n\n';
  report += '| ID | Nome | Descrição | Dependências | Pode Deletar | Motivo |\n';
  report += '|----|------|-----------|--------------|--------------|--------|\n';
  
  testDataCandidates.forEach(item => {
    const deps = `D:${item.dependencies.drivers} P:${item.dependencies.passengers} G:${item.dependencies.guides}`;
    const canDelete = !item.hasDependencies ? 'Sim' : 'Não';
    
    report += `| ${item.id} | ${item.name} | ${item.description || '-'} | ${deps} | ${canDelete} | ${item.reason} |\n`;
  });
  
  report += '\n## Comunidades RJ Válidas (Manter)\n\n';
  rjCommunities.forEach(item => {
    report += `- ${item.name} (${item.id})\n`;
  });
  
  const stats = {
    total: communities.length,
    testCandidates: testDataCandidates.length,
    withDependencies: testDataCandidates.filter(c => c.hasDependencies).length,
    canDelete: testDataCandidates.filter(c => !c.hasDependencies).length,
    rjValid: rjCommunities.length
  };
  
  report += '\n## Estatísticas\n\n';
  report += `- **Total:** ${stats.total}\n`;
  report += `- **Candidatos limpeza:** ${stats.testCandidates}\n`;
  report += `- **Com dependências:** ${stats.withDependencies}\n`;
  report += `- **Podem ser deletados:** ${stats.canDelete}\n`;
  report += `- **RJ válidas:** ${stats.rjValid}\n`;
  
  fs.writeFileSync(reportPath, report);
  
  console.log(`📋 Relatório gerado: ${reportPath}`);
  console.log(`🗑️ Candidatos para limpeza: ${stats.testCandidates}`);
  console.log(`✅ Podem ser deletados: ${stats.canDelete}`);
  console.log(`⚠️ Com dependências: ${stats.withDependencies}`);
  
  return { testDataCandidates, rjCommunities, stats };
}

async function cleanupTestData(dryRun = true) {
  const { testDataCandidates } = await analyzeTestData();
  
  const deletableCandidates = testDataCandidates.filter(c => !c.hasDependencies);
  
  if (deletableCandidates.length === 0) {
    console.log('✅ Nenhum dado de teste pode ser deletado sem dependências');
    return;
  }
  
  console.log(`${dryRun ? '🔍 DRY-RUN:' : '🗑️'} Limpando ${deletableCandidates.length} registros...`);
  
  for (const item of deletableCandidates) {
    if (dryRun) {
      console.log(`  - Deletaria: ${item.name} (${item.id})`);
    } else {
      await prisma.community.delete({
        where: { id: item.id }
      });
      console.log(`  ✅ Deletado: ${item.name} (${item.id})`);
    }
  }
  
  return deletableCandidates.length;
}

async function main() {
  const isDryRun = process.env.DRY_RUN !== 'false';
  
  try {
    await analyzeTestData();
    await cleanupTestData(isDryRun);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeTestData, cleanupTestData };
