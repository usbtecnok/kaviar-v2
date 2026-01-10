#!/usr/bin/env node

/**
 * KAVIAR - Pipeline de Geofences Oficiais RJ
 * Automatiza geofences (Polygon) usando dados oficiais com governança rígida
 * 
 * REGRAS OBRIGATÓRIAS:
 * - NUNCA criar communities (só geofence de existentes)
 * - Aplicar SOMENTE por ID canônico
 * - Idempotência total (UPDATE se existe, CREATE se não)
 * - Allowlist obrigatória (sem apply automático)
 * - Sanity-check antes de gravar
 * 
 * Usage:
 *   node scripts/rj_official_geofence_pipeline.js --dry-run
 *   node scripts/rj_official_geofence_pipeline.js --apply --allowlist audit/approved_communities.txt
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchOfficialPolygon } from './rj_polygon_sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuração
const API_BASE = 'https://kaviar-v2.onrender.com';
const AUDIT_DIR = join(projectRoot, 'audit');
const prisma = new PrismaClient();

// Flags de comando
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const allowlistIndex = args.indexOf('--allowlist');
const allowlistPath = allowlistIndex !== -1 ? args[allowlistIndex + 1] : null;

// Validação de argumentos
if (!isDryRun && !isApply) {
  console.error('❌ Uso: --dry-run ou --apply --allowlist <path>');
  process.exit(1);
}

if (isApply && !allowlistPath) {
  console.error('❌ --apply requer --allowlist <path>');
  process.exit(1);
}

// Garantir diretório audit
if (!existsSync(AUDIT_DIR)) {
  mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Buscar communities canônicas da API governance
 */
async function fetchCanonicalCommunities() {
  console.log('📡 Buscando communities canônicas...');
  
  try {
    const response = await fetch(`${API_BASE}/api/governance/communities`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }
    
    // Filtrar apenas RJ (REMOVER LIMITAÇÃO DE TESTE)
    const rjCommunities = data.data.filter(c => 
      c.description && c.description.includes('Rio de Janeiro')
    );
    
    console.log(`✅ ${rjCommunities.length} communities RJ encontradas`);
    return rjCommunities;
    
  } catch (error) {
    console.error('❌ Erro ao buscar communities:', error.message);
    process.exit(1);
  }
}

/**
 * Verificar status atual do geofence via API
 */
async function checkGeofenceStatus(communityId) {
  try {
    const response = await fetch(`${API_BASE}/api/governance/communities/${communityId}/geofence`);
    
    if (response.status === 200) {
      const data = await response.json();
      return {
        exists: true,
        geometryType: data.data?.geometry?.type || 'UNKNOWN',
        isVerified: data.data?.isVerified || false
      };
    } else if (response.status === 404) {
      return { exists: false };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao verificar geofence ${communityId}: ${error.message}`);
    return { exists: false, error: error.message };
  }
}

/**
 * Buscar polígono oficial usando múltiplas fontes
 */
async function searchOfficialPolygon(communityName) {
  return await fetchOfficialPolygon(communityName);
}

/**
 * Sanity check do polígono (GOVERNANÇA RÍGIDA)
 */
function validatePolygon(community, polygon) {
  const checks = {
    hasGeometry: !!polygon,
    isPolygon: polygon?.type === 'Polygon' || polygon?.type === 'MultiPolygon',
    hasCoordinates: !!polygon?.coordinates?.length,
    isRJ: validateRJMunicipality(polygon),
    centerMatch: validateCenterCompatibility(community, polygon),
    areaPlausible: validateAreaPlausible(polygon),
    confidence: (polygon?.confidence || 0) >= 0.5
  };
  
  const passed = Object.values(checks).every(Boolean);
  
  return {
    passed,
    checks,
    reason: passed ? 'OK' : getFailureReason(checks),
    score: calculateValidationScore(checks)
  };
}

/**
 * Validar se está no município RJ
 */
function validateRJMunicipality(polygon) {
  if (!polygon?.metadata?.display_name) return false;
  
  const displayName = polygon.metadata.display_name.toLowerCase();
  return displayName.includes('rio de janeiro') && 
         displayName.includes('brasil') &&
         !displayName.includes('niterói') &&
         !displayName.includes('são gonçalo');
}

/**
 * Validar compatibilidade com centro da community
 */
function validateCenterCompatibility(community, polygon) {
  if (!community.centerLat || !community.centerLng) return true; // Skip se não tem centro
  if (!polygon?.coordinates) return false;
  
  const centerLat = parseFloat(community.centerLat);
  const centerLng = parseFloat(community.centerLng);
  
  // Calcular bbox do polígono
  const bbox = calculateBBox(polygon);
  if (!bbox) return false;
  
  // Centro deve estar dentro ou próximo do bbox (margem de 0.01 graus ~1km)
  const margin = 0.01;
  return centerLat >= (bbox.minLat - margin) && 
         centerLat <= (bbox.maxLat + margin) &&
         centerLng >= (bbox.minLng - margin) && 
         centerLng <= (bbox.maxLng + margin);
}

/**
 * Validar área plausível (não gigante)
 */
function validateAreaPlausible(polygon) {
  if (!polygon?.coordinates) return false;
  
  const bbox = calculateBBox(polygon);
  if (!bbox) return false;
  
  // Área do bbox em graus quadrados
  const bboxArea = (bbox.maxLat - bbox.minLat) * (bbox.maxLng - bbox.minLng);
  
  // Limite: ~0.1 graus quadrados (~100km²) - bairro não pode ser maior que isso
  return bboxArea <= 0.1;
}

/**
 * Calcular bounding box do polígono
 */
function calculateBBox(polygon) {
  try {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    const coords = polygon.type === 'Polygon' ? polygon.coordinates[0] : 
                   polygon.type === 'MultiPolygon' ? polygon.coordinates[0][0] : null;
    
    if (!coords) return null;
    
    coords.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    return { minLat, maxLat, minLng, maxLng };
  } catch (error) {
    return null;
  }
}

/**
 * Obter razão da falha
 */
function getFailureReason(checks) {
  if (!checks.hasGeometry) return 'NO_GEOMETRY';
  if (!checks.isPolygon) return 'NOT_POLYGON';
  if (!checks.hasCoordinates) return 'NO_COORDINATES';
  if (!checks.isRJ) return 'NOT_RJ_MUNICIPALITY';
  if (!checks.centerMatch) return 'CENTER_MISMATCH';
  if (!checks.areaPlausible) return 'AREA_TOO_LARGE';
  if (!checks.confidence) return 'LOW_CONFIDENCE';
  return 'UNKNOWN_FAILURE';
}

/**
 * Calcular score de validação
 */
function calculateValidationScore(checks) {
  const weights = {
    hasGeometry: 0.2,
    isPolygon: 0.2,
    hasCoordinates: 0.1,
    isRJ: 0.2,
    centerMatch: 0.15,
    areaPlausible: 0.1,
    confidence: 0.05
  };
  
  return Object.entries(checks).reduce((score, [key, passed]) => {
    return score + (passed ? weights[key] || 0 : 0);
  }, 0);
}

/**
 * Determinar ação baseada no estado atual e validação
 */
function determineAction(currentGeofence, newPolygon, validation) {
  if (!validation.passed) {
    return 'NEEDS_MANUAL_REVIEW';
  }
  
  if (!currentGeofence.exists) {
    return 'CREATE';
  }
  
  if (shouldReplaceExisting(currentGeofence, newPolygon, validation)) {
    return 'UPDATE';
  }
  
  return 'KEEP_EXISTING';
}

/**
 * Verificar se deve substituir geofence existente
 */
function shouldReplaceExisting(currentGeofence, newPolygon, validation) {
  // REGRA: Nunca sobrescrever Polygon bom por um pior
  if (currentGeofence.geometryType === 'Polygon' || currentGeofence.geometryType === 'MultiPolygon') {
    // Só substitui se novo tem score significativamente melhor
    const currentScore = 0.8; // Assumir score bom para existente
    const newScore = validation.score;
    
    return newScore > (currentScore + 0.1); // Precisa ser 10% melhor
  }
  
  // Substitui Point/LineString por Polygon sempre
  return validation.passed;
}

/**
 * Processar communities em modo dry-run
 */
async function processDryRun(communities) {
  console.log('\n🧪 MODO DRY-RUN - Analisando candidatos...');
  
  const candidates = [];
  const report = {
    timestamp: new Date().toISOString(),
    mode: 'dry-run',
    totalCommunities: communities.length,
    candidates: [],
    summary: {
      withGeofence: 0,
      withoutGeofence: 0,
      polygonFound: 0,
      polygonNotFound: 0,
      validationPassed: 0,
      validationFailed: 0
    }
  };
  
  for (const community of communities) {
    console.log(`\n📍 Processando: ${community.name} (${community.id})`);
    
    // 1. Verificar status atual
    const geofenceStatus = await checkGeofenceStatus(community.id);
    
    if (geofenceStatus.exists) {
      console.log(`  ✅ Geofence existe: ${geofenceStatus.geometryType}`);
      report.summary.withGeofence++;
    } else {
      console.log(`  📭 Sem geofence`);
      report.summary.withoutGeofence++;
    }
    
    // 2. Buscar polígono oficial
    const polygon = await searchOfficialPolygon(community.name);
    
    if (polygon) {
      console.log(`  🗺️ Polígono encontrado: ${polygon.type} (${polygon.source})`);
      report.summary.polygonFound++;
      
      // 3. Validar polígono
      const validation = validatePolygon(community, polygon);
      
      if (validation.passed) {
        console.log(`  ✅ Validação passou`);
        report.summary.validationPassed++;
        
        const candidate = {
          communityId: community.id,
          communityName: community.name,
          currentGeofence: geofenceStatus,
          proposedGeometry: polygon,
          validation,
          action: determineAction(geofenceStatus, polygon, validation),
          priority: validation.score,
          shouldReplace: shouldReplaceExisting(geofenceStatus, polygon, validation)
        };
        
        candidates.push(candidate);
        report.candidates.push(candidate);
        
      } else {
        console.log(`  ❌ Validação falhou: ${validation.reason}`);
        report.summary.validationFailed++;
        
        report.candidates.push({
          communityId: community.id,
          communityName: community.name,
          currentGeofence: geofenceStatus,
          proposedGeometry: polygon,
          validation,
          action: 'NEEDS_MANUAL_REVIEW',
          priority: 0,
          shouldReplace: false,
          reviewReason: validation.reason
        });
      }
      
    } else {
      console.log(`  📭 Polígono não encontrado`);
      report.summary.polygonNotFound++;
    }
  }
  
  // Salvar relatório
  const reportPath = join(AUDIT_DIR, 'rj_official_candidates_report.md');
  const geojsonPath = join(AUDIT_DIR, 'rj_official_candidates.geojson');
  
  writeFileSync(reportPath, generateCandidatesReport(report));
  writeFileSync(geojsonPath, JSON.stringify(generateCandidatesGeoJSON(candidates), null, 2));
  
  console.log(`\n📄 Relatório salvo: ${reportPath}`);
  console.log(`📄 GeoJSON salvo: ${geojsonPath}`);
  console.log(`\n📊 RESUMO:`);
  console.log(`  Communities analisadas: ${report.totalCommunities}`);
  console.log(`  Com geofence: ${report.summary.withGeofence}`);
  console.log(`  Sem geofence: ${report.summary.withoutGeofence}`);
  console.log(`  Polígonos encontrados: ${report.summary.polygonFound}`);
  console.log(`  Validações aprovadas: ${report.summary.validationPassed}`);
  console.log(`  Candidatos válidos: ${candidates.length}`);
  
  return candidates;
}

/**
 * Aplicar geofences aprovados
 */
async function processApply(communities, allowlistPath) {
  console.log('\n🚀 MODO APPLY - Aplicando geofences...');
  
  // Carregar allowlist
  if (!existsSync(allowlistPath)) {
    console.error(`❌ Allowlist não encontrada: ${allowlistPath}`);
    process.exit(1);
  }
  
  const allowlist = readFileSync(allowlistPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  console.log(`📋 Allowlist carregada: ${allowlist.length} IDs aprovados`);
  
  const report = {
    timestamp: new Date().toISOString(),
    mode: 'apply',
    allowlistPath,
    allowedIds: allowlist,
    results: [],
    summary: {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    }
  };
  
  // Filtrar apenas communities da allowlist
  const allowedCommunities = communities.filter(c => allowlist.includes(c.id));
  
  console.log(`🎯 ${allowedCommunities.length} communities na allowlist`);
  
  for (const community of allowedCommunities) {
    console.log(`\n📍 Aplicando: ${community.name} (${community.id})`);
    
    try {
      // 1. Buscar polígono
      const polygon = await searchOfficialPolygon(community.name);
      
      if (!polygon) {
        console.log(`  📭 Polígono não encontrado - SKIP`);
        report.summary.skipped++;
        continue;
      }
      
      // 2. Validar
      const validation = validatePolygon(community, polygon);
      
      if (!validation.passed) {
        console.log(`  ❌ Validação falhou - SKIP`);
        report.summary.skipped++;
        continue;
      }
      
      // 3. Verificar se existe
      const existing = await prisma.communityGeofence.findUnique({
        where: { communityId: community.id }
      });
      
      // 4. Aplicar (CREATE ou UPDATE)
      const geofenceData = {
        geojson: JSON.stringify(polygon),
        centerLat: polygon.center?.[1]?.toString() || community.centerLat?.toString(),
        centerLng: polygon.center?.[0]?.toString() || community.centerLng?.toString(),
        confidence: polygon.confidence?.toString() || '0.8',
        isVerified: false, // SEMPRE false conforme governança
        source: polygon.source || 'RJ_OFFICIAL_PIPELINE'
      };
      
      if (existing) {
        await prisma.communityGeofence.update({
          where: { communityId: community.id },
          data: geofenceData
        });
        console.log(`  ✅ UPDATED`);
        report.summary.updated++;
      } else {
        await prisma.communityGeofence.create({
          data: {
            communityId: community.id,
            ...geofenceData
          }
        });
        console.log(`  ✅ CREATED`);
        report.summary.created++;
      }
      
      report.summary.processed++;
      
    } catch (error) {
      console.error(`  ❌ ERRO: ${error.message}`);
      report.summary.errors++;
      
      report.results.push({
        communityId: community.id,
        communityName: community.name,
        action: 'ERROR',
        error: error.message
      });
    }
  }
  
  // Salvar relatório de aplicação
  const applyReportPath = join(AUDIT_DIR, 'rj_official_apply_report.md');
  writeFileSync(applyReportPath, generateApplyReport(report));
  
  console.log(`\n📄 Relatório de aplicação salvo: ${applyReportPath}`);
  console.log(`\n📊 RESUMO FINAL:`);
  console.log(`  Processadas: ${report.summary.processed}`);
  console.log(`  Criadas: ${report.summary.created}`);
  console.log(`  Atualizadas: ${report.summary.updated}`);
  console.log(`  Puladas: ${report.summary.skipped}`);
  console.log(`  Erros: ${report.summary.errors}`);
}

/**
 * Gerar relatório de candidatos
 */
function generateCandidatesReport(report) {
  const validCandidates = report.candidates.filter(c => c.action === 'CREATE' || c.action === 'UPDATE');
  const keepExisting = report.candidates.filter(c => c.action === 'KEEP_EXISTING');
  const needsReview = report.candidates.filter(c => c.action === 'NEEDS_MANUAL_REVIEW');
  
  return `# RJ Official Geofences - Candidates Report (ESCALA COMPLETA)

**Timestamp:** ${report.timestamp}  
**Mode:** ${report.mode}  
**Total Communities:** ${report.totalCommunities}

## 📊 Summary

- **With Geofence:** ${report.summary.withGeofence}
- **Without Geofence:** ${report.summary.withoutGeofence}  
- **Polygons Found:** ${report.summary.polygonFound}
- **Polygons Not Found:** ${report.summary.polygonNotFound}
- **Validation Passed:** ${report.summary.validationPassed}
- **Validation Failed:** ${report.summary.validationFailed}

## 🎯 Actions Summary

- **CREATE:** ${report.candidates.filter(c => c.action === 'CREATE').length}
- **UPDATE:** ${report.candidates.filter(c => c.action === 'UPDATE').length}
- **KEEP_EXISTING:** ${keepExisting.length}
- **NEEDS_MANUAL_REVIEW:** ${needsReview.length}

## ✅ Valid Candidates (Ready for Apply)

${validCandidates
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 50) // Limitar a 50 para não sobrecarregar
  .map(c => `- **${c.communityName}** (${c.communityId}) - ${c.action} - Score: ${c.priority.toFixed(3)} - ${c.proposedGeometry.source}`)
  .join('\n')}

${validCandidates.length > 50 ? `\n... e mais ${validCandidates.length - 50} candidatos` : ''}

## 🔄 Keep Existing (Good Polygons)

${keepExisting
  .slice(0, 20)
  .map(c => `- **${c.communityName}** (${c.communityId}) - Current: ${c.currentGeofence.geometryType} - Proposed: ${c.proposedGeometry.type}`)
  .join('\n')}

${keepExisting.length > 20 ? `\n... e mais ${keepExisting.length - 20} para manter` : ''}

## ⚠️ Manual Review Required

${needsReview
  .slice(0, 20)
  .map(c => `- **${c.communityName}** (${c.communityId}) - Reason: ${c.reviewReason || c.validation.reason}`)
  .join('\n')}

${needsReview.length > 20 ? `\n... e mais ${needsReview.length - 20} para revisar` : ''}

## 📋 Next Steps - BATCH PROCESSING

### Batch 01 (Recommended - High Priority)
Create allowlist with top 10 candidates:
\`\`\`
${validCandidates
  .sort((a, b) => b.priority - a.priority)
  .slice(0, 10)
  .map(c => `${c.communityId}  # ${c.communityName} - ${c.action}`)
  .join('\n')}
\`\`\`

### Commands
1. Create: \`audit/allowlist_batch_01.txt\`
2. Run: \`node scripts/rj_official_geofence_pipeline.js --apply --allowlist audit/allowlist_batch_01.txt\`

---
Generated by RJ Official Geofence Pipeline (ESCALA COMPLETA)
`;
}

/**
 * Gerar GeoJSON dos candidatos
 */
function generateCandidatesGeoJSON(candidates) {
  return {
    type: 'FeatureCollection',
    features: candidates.map(c => ({
      type: 'Feature',
      properties: {
        communityId: c.communityId,
        communityName: c.communityName,
        action: c.action,
        priority: c.priority,
        source: c.proposedGeometry.source
      },
      geometry: c.proposedGeometry
    }))
  };
}

/**
 * Gerar relatório de aplicação
 */
function generateApplyReport(report) {
  return `# RJ Official Geofences - Apply Report

**Timestamp:** ${report.timestamp}  
**Mode:** ${report.mode}  
**Allowlist:** ${report.allowlistPath}  
**Allowed IDs:** ${report.allowedIds.length}

## 📊 Summary

- **Processed:** ${report.summary.processed}
- **Created:** ${report.summary.created}
- **Updated:** ${report.summary.updated}
- **Skipped:** ${report.summary.skipped}
- **Errors:** ${report.summary.errors}

## 🎯 Results

${report.results.map(r => `- **${r.communityName}** (${r.communityId}) - ${r.action}${r.error ? ` - ERROR: ${r.error}` : ''}`).join('\n')}

---
Generated by RJ Official Geofence Pipeline
`;
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️ KAVIAR - RJ Official Geofence Pipeline');
  console.log('==========================================');
  
  try {
    // 1. Buscar communities canônicas
    const communities = await fetchCanonicalCommunities();
    
    if (isDryRun) {
      // 2a. Modo dry-run
      await processDryRun(communities);
    } else if (isApply) {
      // 2b. Modo apply
      await processApply(communities, allowlistPath);
    }
    
    console.log('\n🎉 Pipeline concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no pipeline:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, fetchCanonicalCommunities, checkGeofenceStatus };
