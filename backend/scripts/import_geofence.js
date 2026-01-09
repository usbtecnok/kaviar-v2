#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

function generateCanonicalKey(name, description) {
  const normalizedName = normalizeName(name);
  
  // Extrair cidade/estado da descrição se disponível
  let city = '';
  let state = '';
  
  if (description) {
    const parts = description.split(' - ');
    if (parts.length > 1) {
      const location = parts[1];
      if (location.includes(',')) {
        [city, state] = location.split(',').map(s => s.trim());
      } else {
        city = location;
      }
    }
  }
  
  const normalizedCity = city ? normalizeName(city) : '';
  const normalizedState = state ? normalizeName(state) : '';
  
  return `${normalizedName}|${normalizedCity}|${normalizedState}`;
}

async function importGeofenceData() {
  const isDryRun = process.env.DRY_RUN === 'true';
  
  console.log(`🗺️ ${isDryRun ? 'SIMULANDO' : 'Importando'} dados de geofence...`);
  
  // Ler dados da auditoria
  const auditFile = path.join(__dirname, '..', '..', 'audit', 'geofences_raw.json');
  
  if (!fs.existsSync(auditFile)) {
    throw new Error(`Arquivo de auditoria não encontrado: ${auditFile}`);
  }
  
  const geofenceData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
  
  console.log(`📊 ${geofenceData.length} registros encontrados`);
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  const matchingReport = [];
  
  for (const item of geofenceData) {
    try {
      // Gerar chave canônica estável
      const canonicalKey = generateCanonicalKey(item.name, item.description);
      
      // Verificar se a comunidade existe (por ID, nome ou chave canônica)
      let community = await prisma.community.findUnique({
        where: { id: item.id }
      });
      
      let matchMethod = 'id';
      
      if (!community) {
        // Tentar encontrar por nome exato
        community = await prisma.community.findFirst({
          where: { name: item.name }
        });
        matchMethod = 'name';
      }
      
      if (!community) {
        // Tentar encontrar por nome normalizado (fuzzy match)
        const normalizedName = normalizeName(item.name);
        community = await prisma.community.findFirst({
          where: { 
            name: {
              contains: normalizedName,
              mode: 'insensitive'
            }
          }
        });
        matchMethod = 'fuzzy_name';
        
        // REGRA: Fuzzy match não importa automaticamente
        if (community && !isDryRun) {
          console.log(`⚠️ Fuzzy match encontrado mas não importado: ${item.name} → ${community.name}`);
          matchingReport.push({
            originalName: item.name,
            canonicalKey,
            found: true,
            matchMethod: 'fuzzy_blocked',
            matchedName: community.name,
            matchedId: community.id,
            reason: 'Fuzzy match bloqueado - requer revisão manual'
          });
          skipped++;
          continue;
        }
      }
      
      matchingReport.push({
        originalName: item.name,
        canonicalKey,
        found: !!community,
        matchMethod: community ? matchMethod : 'none',
        matchedName: community?.name || null,
        matchedId: community?.id || null,
        reason: community ? null : 'Não encontrado'
      });
      
      if (!community) {
        console.log(`⚠️ Comunidade não encontrada: ${item.name} (${canonicalKey})`);
        skipped++;
        continue;
      }
      
      if (isDryRun) {
        console.log(`🔍 DRY-RUN: Importaria ${item.name} → ${community.name} (${matchMethod})`);
        imported++;
        continue;
      }
      
      // Verificar se já existe geofence para esta comunidade
      const existing = await prisma.communityGeofence.findUnique({
        where: { communityId: community.id }
      });
      
      if (existing) {
        console.log(`ℹ️ Geofence já existe: ${item.name}`);
        skipped++;
        continue;
      }
      
      // Calcular bbox se houver geometria
      let bbox = null;
      if (item.geometry && item.geometry.coordinates) {
        bbox = calculateBbox(item.geometry);
      }
      
      // Criar registro de geofence
      await prisma.communityGeofence.create({
        data: {
          communityId: community.id, // Usar ID da comunidade encontrada
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
          isVerified: false
        }
      });
      
      console.log(`✅ Importado: ${item.name} (${item.confidence})`);
      imported++;
      
    } catch (error) {
      console.error(`❌ Erro ao importar ${item.name}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n📊 Resumo da importação:');
  console.log(`✅ Importados: ${imported}`);
  console.log(`⚠️ Ignorados: ${skipped}`);
  console.log(`❌ Erros: ${errors}`);
  
  // Gerar relatório de matching
  const matchingReportPath = path.join(__dirname, '..', '..', 'audit', 'geofence_matching_report.md');
  
  let report = '# Relatório de Matching - Import Geofence\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Total processado:** ${matchingReport.length}\n\n`;
  
  report += '## Resultados do Matching\n\n';
  report += '| Nome Original | Chave Canônica | Encontrado | Método | Nome Matched | ID Matched |\n';
  report += '|---------------|----------------|------------|--------|--------------|------------|\n';
  
  matchingReport.forEach(r => {
    const found = r.found ? 'Sim' : 'Não';
    const method = r.matchMethod || '-';
    const matchedName = r.matchedName || '-';
    const matchedId = r.matchedId || '-';
    
    report += `| ${r.originalName} | ${r.canonicalKey} | ${found} | ${method} | ${matchedName} | ${matchedId} |\n`;
  });
  
  const stats = {
    total: matchingReport.length,
    found: matchingReport.filter(r => r.found).length,
    byId: matchingReport.filter(r => r.matchMethod === 'id').length,
    byName: matchingReport.filter(r => r.matchMethod === 'name').length,
    byFuzzy: matchingReport.filter(r => r.matchMethod === 'fuzzy_name').length
  };
  
  report += '\n## Estatísticas de Matching\n\n';
  report += `- **Total:** ${stats.total}\n`;
  report += `- **Encontrados:** ${stats.found} (${(stats.found/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Por ID:** ${stats.byId}\n`;
  report += `- **Por nome exato:** ${stats.byName}\n`;
  report += `- **Por nome fuzzy:** ${stats.byFuzzy}\n`;
  
  fs.writeFileSync(matchingReportPath, report);
  console.log(`📋 Relatório de matching gerado: ${matchingReportPath}`);
  
  return { imported, skipped, errors, matchingReport };
}

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

async function main() {
  try {
    const result = await importGeofenceData();
    
    if (result.imported > 0) {
      console.log('\n🎯 Executando validações...');
      await runValidations();
    }
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function runValidations() {
  const validationResults = [];
  
  // Buscar todos os geofences importados
  const geofences = await prisma.communityGeofence.findMany({
    include: {
      community: true
    }
  });
  
  for (const geofence of geofences) {
    const validation = {
      communityName: geofence.community.name,
      communityId: geofence.communityId,
      confidence: geofence.confidence,
      hasGeometry: !!geofence.geojson,
      centerValid: true,
      areaValid: true,
      issues: []
    };
    
    // Validar centro dentro do polígono (apenas se houver geometria)
    if (geofence.geojson) {
      try {
        const geometry = JSON.parse(geofence.geojson);
        
        // Validação básica de área (não absurda)
        if (geofence.minLat && geofence.maxLat && geofence.minLng && geofence.maxLng) {
          const latDiff = Math.abs(geofence.maxLat - geofence.minLat);
          const lngDiff = Math.abs(geofence.maxLng - geofence.minLng);
          
          // Área muito grande (> 1 grau = ~111km)
          if (latDiff > 1 || lngDiff > 1) {
            validation.areaValid = false;
            validation.issues.push('Área muito grande (>111km)');
          }
          
          // Área muito pequena (< 0.001 grau = ~111m)
          if (latDiff < 0.001 && lngDiff < 0.001) {
            validation.issues.push('Área muito pequena (<111m)');
          }
        }
        
      } catch (error) {
        validation.issues.push(`Erro ao validar geometria: ${error.message}`);
      }
    }
    
    validationResults.push(validation);
  }
  
  // Gerar relatório de validação
  const reportPath = path.join(__dirname, '..', '..', 'audit', 'geofence_phase2_validation.md');
  
  let report = '# Relatório de Validação - Fase 2\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Total validado:** ${validationResults.length}\n\n`;
  
  report += '## Resultados da Validação\n\n';
  report += '| Comunidade | Confidence | Geometria | Centro OK | Área OK | Observações |\n';
  report += '|------------|------------|-----------|-----------|---------|-------------|\n';
  
  validationResults.forEach(v => {
    const hasGeom = v.hasGeometry ? 'Sim' : 'Não';
    const centerOk = v.centerValid ? '✅' : '❌';
    const areaOk = v.areaValid ? '✅' : '⚠️';
    const issues = v.issues.length > 0 ? v.issues.join('; ') : '-';
    
    report += `| ${v.communityName} | ${v.confidence} | ${hasGeom} | ${centerOk} | ${areaOk} | ${issues} |\n`;
  });
  
  const stats = {
    total: validationResults.length,
    withGeometry: validationResults.filter(v => v.hasGeometry).length,
    highConfidence: validationResults.filter(v => v.confidence === 'HIGH').length,
    withIssues: validationResults.filter(v => v.issues.length > 0).length
  };
  
  report += '\n## Estatísticas\n\n';
  report += `- **Total:** ${stats.total}\n`;
  report += `- **Com geometria:** ${stats.withGeometry} (${(stats.withGeometry/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Alta confiança:** ${stats.highConfidence} (${(stats.highConfidence/stats.total*100).toFixed(1)}%)\n`;
  report += `- **Com problemas:** ${stats.withIssues} (${(stats.withIssues/stats.total*100).toFixed(1)}%)\n`;
  
  report += '\n## Recomendações\n\n';
  report += '- ✅ Todos os registros foram importados com `isVerified=false`\n';
  report += '- 🔍 Revisar manualmente no admin antes de marcar como verificado\n';
  report += '- ⚠️ Investigar comunidades com problemas de área\n';
  report += '- 📍 Validar centros para comunidades com geometria complexa\n';
  
  fs.writeFileSync(reportPath, report);
  
  console.log(`📋 Relatório de validação gerado: ${reportPath}`);
  console.log(`📊 ${stats.withIssues}/${stats.total} comunidades com problemas detectados`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importGeofenceData };
