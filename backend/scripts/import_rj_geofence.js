const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function calculateBbox(geometry) {
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  
  function processCoordinates(coords) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoordinates);
    } else {
      const [lng, lat] = coords;
      minLat = Math.min(minLat, lat);
      minLng = Math.min(minLng, lng);
      maxLat = Math.max(maxLat, lat);
      maxLng = Math.max(maxLng, lng);
    }
  }
  
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return { minLat: lat, minLng: lng, maxLat: lat, maxLng: lng };
  } else if (geometry.coordinates) {
    processCoordinates(geometry.coordinates);
    return { minLat, minLng, maxLat, maxLng };
  }
  
  return null;
}

async function importRJGeofenceData() {
  const isDryRun = process.env.DRY_RUN === 'true';
  
  console.log(`🗺️ ${isDryRun ? 'SIMULANDO' : 'Importando'} dados de geofence do RJ...`);
  
  // Ler dados da pesquisa RJ
  const auditFile = path.join(__dirname, '..', '..', 'audit', 'rj_geofences_raw.json');
  
  if (!fs.existsSync(auditFile)) {
    throw new Error(`Arquivo de pesquisa RJ não encontrado: ${auditFile}`);
  }
  
  const geofenceData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  
  console.log(`📊 ${geofenceData.length} registros encontrados`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const importReport = [];
  
  for (const item of geofenceData) {
    try {
      // Verificar se a comunidade existe
      const community = await prisma.community.findUnique({
        where: { id: item.id }
      });
      
      if (!community) {
        console.log(`⚠️ Comunidade não encontrada: ${item.name} (${item.id})`);
        importReport.push({
          name: item.name,
          status: 'not_found',
          reason: 'Comunidade não existe no banco'
        });
        skipped++;
        continue;
      }
      
      // Verificar se já existe geofence
      const existing = await prisma.communityGeofence.findUnique({
        where: { communityId: item.id }
      });
      
      if (existing) {
        console.log(`ℹ️ Geofence já existe: ${item.name}`);
        importReport.push({
          name: item.name,
          status: 'exists',
          reason: 'Geofence já existe'
        });
        skipped++;
        continue;
      }
      
      // Só importar se encontrou dados válidos
      if (!item.found || !item.centerLat || !item.centerLng) {
        console.log(`⚠️ Dados insuficientes: ${item.name}`);
        importReport.push({
          name: item.name,
          status: 'insufficient_data',
          reason: 'Não encontrado no OpenStreetMap ou dados incompletos'
        });
        skipped++;
        continue;
      }
      
      if (isDryRun) {
        console.log(`🔍 DRY-RUN: Importaria ${item.name} (${item.confidence})`);
        importReport.push({
          name: item.name,
          status: 'would_import',
          confidence: item.confidence,
          hasGeometry: !!item.geometry
        });
        imported++;
        continue;
      }
      
      // Calcular bbox se houver geometria
      let bbox = null;
      if (item.geometry) {
        bbox = calculateBbox(item.geometry);
      }
      
      // Criar registro de geofence
      await prisma.communityGeofence.create({
        data: {
          communityId: item.id,
          centerLat: item.centerLat,
          centerLng: item.centerLng,
          minLat: bbox?.minLat || null,
          minLng: bbox?.minLng || null,
          maxLat: bbox?.maxLat || null,
          maxLng: bbox?.maxLng || null,
          geojson: item.geometry ? JSON.stringify(item.geometry) : null,
          source: item.source,
          sourceRef: item.sourceRef?.toString() || null,
          confidence: item.confidence,
          isVerified: false // SEMPRE false para revisão manual
        }
      });
      
      console.log(`✅ Importado: ${item.name} (${item.confidence})`);
      importReport.push({
        name: item.name,
        status: 'imported',
        confidence: item.confidence,
        hasGeometry: !!item.geometry
      });
      imported++;
      
    } catch (error) {
      console.error(`❌ Erro ao importar ${item.name}: ${error.message}`);
      importReport.push({
        name: item.name,
        status: 'error',
        reason: error.message
      });
      errors++;
    }
  }
  
  // Gerar relatório de importação
  const reportPath = path.join(__dirname, '..', '..', 'audit', 'rj_geofence_import_report.md');
  
  let report = `# Relatório de Importação Geofence - Rio de Janeiro\n\n`;
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Modo:** ${isDryRun ? 'DRY-RUN (Simulação)' : 'IMPORT REAL'}\n`;
  report += `**Total processado:** ${geofenceData.length}\n\n`;
  
  report += '## Resumo\n\n';
  report += `- **Importados:** ${imported}\n`;
  report += `- **Ignorados:** ${skipped}\n`;
  report += `- **Erros:** ${errors}\n\n`;
  
  const byStatus = {
    imported: importReport.filter(r => r.status === 'imported' || r.status === 'would_import').length,
    exists: importReport.filter(r => r.status === 'exists').length,
    not_found: importReport.filter(r => r.status === 'not_found').length,
    insufficient_data: importReport.filter(r => r.status === 'insufficient_data').length,
    error: importReport.filter(r => r.status === 'error').length
  };
  
  report += '## Status Detalhado\n\n';
  report += `- **${isDryRun ? 'Seriam importados' : 'Importados'}:** ${byStatus.imported}\n`;
  report += `- **Já existiam:** ${byStatus.exists}\n`;
  report += `- **Não encontrados:** ${byStatus.not_found}\n`;
  report += `- **Dados insuficientes:** ${byStatus.insufficient_data}\n`;
  report += `- **Erros:** ${byStatus.error}\n\n`;
  
  const byConfidence = {
    HIGH: importReport.filter(r => r.confidence === 'HIGH').length,
    MED: importReport.filter(r => r.confidence === 'MED').length,
    LOW: importReport.filter(r => r.confidence === 'LOW').length
  };
  
  report += '## Distribuição por Confiança\n\n';
  report += `- **HIGH:** ${byConfidence.HIGH}\n`;
  report += `- **MED:** ${byConfidence.MED}\n`;
  report += `- **LOW:** ${byConfidence.LOW}\n\n`;
  
  report += '## Itens Processados\n\n';
  report += '| Nome | Status | Confiança | Geometria | Observação |\n';
  report += '|------|--------|-----------|-----------|------------|\n';
  
  importReport.forEach(item => {
    const status = item.status === 'would_import' ? 'Importaria' : 
                   item.status === 'imported' ? 'Importado' :
                   item.status === 'exists' ? 'Já existe' :
                   item.status === 'not_found' ? 'Não encontrado' :
                   item.status === 'insufficient_data' ? 'Dados insuficientes' :
                   item.status === 'error' ? 'Erro' : item.status;
    
    const confidence = item.confidence || '-';
    const hasGeometry = item.hasGeometry ? 'Sim' : 'Não';
    const reason = item.reason || '-';
    
    report += `| ${item.name} | ${status} | ${confidence} | ${hasGeometry} | ${reason} |\n`;
  });
  
  fs.writeFileSync(reportPath, report);
  
  console.log('\n📊 Resumo da importação:');
  console.log(`✅ ${isDryRun ? 'Seriam importados' : 'Importados'}: ${imported}`);
  console.log(`⚠️ Ignorados: ${skipped}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`📋 Relatório: ${reportPath}`);
  
  return { imported, skipped, errors, importReport };
}

async function main() {
  try {
    await importRJGeofenceData();
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importRJGeofenceData };
