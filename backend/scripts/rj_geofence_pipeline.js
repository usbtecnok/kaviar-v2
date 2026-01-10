#!/usr/bin/env node

/**
 * KAVIAR - Pipeline Idempotente RJ Geofences
 * Popula/atualiza APENAS geofences sem criar communities
 * 
 * REGRAS OBRIGATÓRIAS:
 * - NUNCA criar communities (só CommunityGeofence)
 * - Usar ID canônico (fonte: /api/governance/communities)
 * - Idempotência total (UPSERT por communityId)
 * - Allowlist obrigatória (não aplicar em lote total)
 * - Sanity-check antes de salvar
 * 
 * Usage:
 *   node scripts/rj_geofence_pipeline.js --dry-run
 *   node scripts/rj_geofence_pipeline.js --apply --ids id1,id2,id3
 *   node scripts/rj_geofence_pipeline.js --apply --allowlist audit/rj_allowlist_ids.txt
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuração
const API_BASE = 'https://kaviar-v2.onrender.com';
const OSM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'KAVIAR-RJ-Pipeline/1.0';
const AUDIT_DIR = join(projectRoot, 'audit');
const prisma = new PrismaClient();

// Parse argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const idsIndex = args.indexOf('--ids');
const allowlistIndex = args.indexOf('--allowlist');

let targetIds = [];

if (idsIndex !== -1) {
  targetIds = args[idsIndex + 1].split(',').map(id => id.trim());
} else if (allowlistIndex !== -1) {
  const allowlistPath = args[allowlistIndex + 1];
  if (existsSync(allowlistPath)) {
    targetIds = readFileSync(allowlistPath, 'utf8')
      .split('\n')
      .map(line => {
        // Extrair apenas o ID (primeira parte antes do espaço/comentário)
        const id = line.trim().split(/\s+/)[0];
        return id;
      })
      .filter(id => id && !id.startsWith('#') && id.length > 10); // IDs válidos
  }
}

// Validação
if (!isDryRun && !isApply) {
  console.error('❌ Uso: --dry-run ou --apply --ids <lista> ou --apply --allowlist <path>');
  process.exit(1);
}

if (isApply && targetIds.length === 0) {
  console.error('❌ --apply requer --ids ou --allowlist');
  process.exit(1);
}

// Garantir diretório audit
if (!existsSync(AUDIT_DIR)) {
  mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Buscar communities canônicas
 */
async function fetchCanonicalCommunities() {
  const response = await fetch(`${API_BASE}/api/governance/communities`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`API error: ${data.error}`);
  }
  
  return data.data.filter(c => 
    c.description && c.description.includes('Rio de Janeiro')
  );
}

/**
 * Verificar status atual do geofence
 */
async function checkCurrentGeofence(communityId) {
  try {
    const existing = await prisma.communityGeofence.findUnique({
      where: { communityId },
      select: {
        geojson: true,
        isVerified: true,
        confidence: true,
        source: true
      }
    });
    
    if (!existing) {
      return { exists: false, action: 'CREATE' };
    }
    
    const geojson = JSON.parse(existing.geojson);
    const geometryType = geojson.type;
    
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      return { 
        exists: true, 
        geometryType, 
        action: 'SKIP',
        reason: 'Already has good Polygon'
      };
    }
    
    return { 
      exists: true, 
      geometryType, 
      action: 'UPDATE',
      reason: `Upgrade ${geometryType} to Polygon`
    };
    
  } catch (error) {
    return { exists: false, action: 'CREATE', error: error.message };
  }
}

/**
 * Buscar polígono oficial (OSM como fallback)
 */
async function fetchOfficialPolygon(communityName) {
  try {
    const searchTerms = [
      `${communityName}, Rio de Janeiro, Brasil`,
      `${communityName}, RJ, Brasil`
    ];
    
    for (const query of searchTerms) {
      const response = await fetch(`${OSM_BASE}/search?` + new URLSearchParams({
        q: query,
        format: 'geojson',
        polygon_geojson: '1',
        addressdetails: '1',
        limit: '3',
        countrycodes: 'br'
      }), {
        headers: { 'User-Agent': USER_AGENT }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const candidates = data.features.filter(feature => {
          const props = feature.properties;
          const address = props.address || {};
          
          const isRJ = address.city === 'Rio de Janeiro' || 
                      props.display_name?.includes('Rio de Janeiro');
          const hasPolygon = feature.geometry?.type === 'Polygon' || 
                           feature.geometry?.type === 'MultiPolygon';
          const isArea = props.osm_type === 'way' || props.osm_type === 'relation';
          
          return isRJ && hasPolygon && isArea;
        });
        
        if (candidates.length > 0) {
          const best = candidates[0];
          
          return {
            type: best.geometry.type,
            coordinates: best.geometry.coordinates,
            source: `OSM_${best.properties.osm_type}_${best.properties.osm_id}`,
            confidence: '0.8',
            metadata: {
              osm_id: best.properties.osm_id,
              osm_type: best.properties.osm_type,
              display_name: best.properties.display_name
            }
          };
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
    
  } catch (error) {
    console.warn(`⚠️ Erro buscando polígono para ${communityName}: ${error.message}`);
    return null;
  }
}

/**
 * Validar polígono antes de salvar
 */
function validatePolygon(polygon) {
  if (!polygon) return { valid: false, reason: 'NO_POLYGON' };
  if (!polygon.type || !polygon.coordinates) return { valid: false, reason: 'INVALID_GEOMETRY' };
  if (polygon.type !== 'Polygon' && polygon.type !== 'MultiPolygon') {
    return { valid: false, reason: 'NOT_POLYGON' };
  }
  
  return { valid: true };
}

/**
 * Calcular centro do polígono
 */
function calculatePolygonCenter(polygon) {
  try {
    const coords = polygon.type === 'Polygon' ? polygon.coordinates[0] : 
                   polygon.type === 'MultiPolygon' ? polygon.coordinates[0][0] : null;
    
    if (!coords || coords.length === 0) return { lat: null, lng: null };
    
    let sumLat = 0, sumLng = 0;
    coords.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
    });
    
    return {
      lat: (sumLat / coords.length).toString(),
      lng: (sumLng / coords.length).toString()
    };
  } catch (error) {
    return { lat: null, lng: null };
  }
}

/**
 * Aplicar geofence (CREATE ou UPDATE)
 */
async function applyGeofence(communityId, polygon, action) {
  const center = calculatePolygonCenter(polygon);
  
  const geofenceData = {
    geojson: JSON.stringify(polygon),
    centerLat: center.lat || '0',
    centerLng: center.lng || '0',
    confidence: polygon.confidence || '0.8',
    isVerified: false, // SEMPRE false conforme governança
    source: polygon.source || 'RJ_PIPELINE'
  };
  
  if (action === 'CREATE') {
    await prisma.communityGeofence.create({
      data: {
        communityId,
        ...geofenceData
      }
    });
  } else if (action === 'UPDATE') {
    await prisma.communityGeofence.update({
      where: { communityId },
      data: geofenceData
    });
  }
}

/**
 * Processar em modo dry-run
 */
async function processDryRun(communities, targetIds) {
  console.log('🧪 MODO DRY-RUN - Analisando candidatos...');
  
  const results = [];
  const summary = {
    processed: 0,
    wouldCreate: 0,
    wouldUpdate: 0,
    wouldSkip: 0,
    wouldFail: 0,
    noPolygon: 0
  };
  
  // Filtrar apenas IDs alvo se especificados
  const targetCommunities = targetIds.length > 0 
    ? communities.filter(c => targetIds.includes(c.id))
    : communities;
  
  console.log(`📍 Processando ${targetCommunities.length} communities (de ${communities.length} total)...`);
  
  if (targetCommunities.length === 0) {
    console.log('⚠️ Nenhuma community encontrada com os IDs especificados');
    return [];
  }
  
  for (const community of targetCommunities) {
    console.log(`\n📍 ${community.name} (${community.id})`);
    
    // 1. Verificar status atual
    const currentStatus = await checkCurrentGeofence(community.id);
    console.log(`  📊 Status atual: ${currentStatus.action} - ${currentStatus.reason || 'N/A'}`);
    
    if (currentStatus.action === 'SKIP') {
      summary.wouldSkip++;
      results.push({
        communityId: community.id,
        communityName: community.name,
        action: 'SKIP',
        reason: currentStatus.reason,
        source: 'N/A'
      });
      continue;
    }
    
    // 2. Buscar polígono oficial
    const polygon = await fetchOfficialPolygon(community.name);
    
    if (!polygon) {
      console.log(`  📭 Sem polígono oficial disponível`);
      summary.noPolygon++;
      results.push({
        communityId: community.id,
        communityName: community.name,
        action: 'SEM_FONTE',
        reason: 'No official polygon found',
        source: 'N/A'
      });
      continue;
    }
    
    console.log(`  🗺️ Polígono encontrado: ${polygon.type} (${polygon.source})`);
    
    // 3. Validar polígono
    const validation = validatePolygon(polygon);
    
    if (!validation.valid) {
      console.log(`  ❌ Validação falhou: ${validation.reason}`);
      summary.wouldFail++;
      results.push({
        communityId: community.id,
        communityName: community.name,
        action: 'FAIL',
        reason: validation.reason,
        source: polygon.source
      });
      continue;
    }
    
    console.log(`  ✅ Validação passou - ${currentStatus.action}`);
    
    if (currentStatus.action === 'CREATE') {
      summary.wouldCreate++;
    } else if (currentStatus.action === 'UPDATE') {
      summary.wouldUpdate++;
    }
    
    results.push({
      communityId: community.id,
      communityName: community.name,
      action: currentStatus.action,
      reason: currentStatus.reason,
      source: polygon.source,
      geometryType: polygon.type
    });
    
    summary.processed++;
  }
  
  // Salvar relatório
  const reportPath = join(AUDIT_DIR, 'rj_pipeline_dry_run.md');
  const report = generateDryRunReport(results, summary, targetIds);
  writeFileSync(reportPath, report);
  
  console.log(`\n📄 Relatório salvo: ${reportPath}`);
  console.log(`\n📊 RESUMO:`);
  console.log(`  Processadas: ${summary.processed}`);
  console.log(`  Criaria: ${summary.wouldCreate}`);
  console.log(`  Atualizaria: ${summary.wouldUpdate}`);
  console.log(`  Pularia: ${summary.wouldSkip}`);
  console.log(`  Falharia: ${summary.wouldFail}`);
  console.log(`  Sem fonte: ${summary.noPolygon}`);
  
  return results;
}

/**
 * Processar em modo apply
 */
async function processApply(communities, targetIds) {
  console.log('🚀 MODO APPLY - Aplicando geofences...');
  
  const results = [];
  const summary = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    noPolygon: 0
  };
  
  const targetCommunities = communities.filter(c => targetIds.includes(c.id));
  console.log(`🎯 ${targetCommunities.length} communities na allowlist`);
  
  for (const community of targetCommunities) {
    console.log(`\n📍 ${community.name} (${community.id})`);
    
    try {
      // 1. Verificar status atual
      const currentStatus = await checkCurrentGeofence(community.id);
      
      if (currentStatus.action === 'SKIP') {
        console.log(`  ⏭️ SKIP - ${currentStatus.reason}`);
        summary.skipped++;
        results.push({
          communityId: community.id,
          communityName: community.name,
          action: 'SKIP',
          result: 'success'
        });
        continue;
      }
      
      // 2. Buscar polígono
      const polygon = await fetchOfficialPolygon(community.name);
      
      if (!polygon) {
        console.log(`  📭 SEM_FONTE - Sem polígono oficial`);
        summary.noPolygon++;
        results.push({
          communityId: community.id,
          communityName: community.name,
          action: 'SEM_FONTE',
          result: 'no_polygon'
        });
        continue;
      }
      
      // 3. Validar
      const validation = validatePolygon(polygon);
      
      if (!validation.valid) {
        console.log(`  ❌ FAIL - ${validation.reason}`);
        summary.failed++;
        results.push({
          communityId: community.id,
          communityName: community.name,
          action: 'FAIL',
          result: 'validation_failed',
          error: validation.reason
        });
        continue;
      }
      
      // 4. Aplicar
      await applyGeofence(community.id, polygon, currentStatus.action);
      
      console.log(`  ✅ ${currentStatus.action} - ${polygon.source}`);
      
      if (currentStatus.action === 'CREATE') {
        summary.created++;
      } else if (currentStatus.action === 'UPDATE') {
        summary.updated++;
      }
      
      results.push({
        communityId: community.id,
        communityName: community.name,
        action: currentStatus.action,
        result: 'success',
        source: polygon.source,
        geometryType: polygon.type
      });
      
      summary.processed++;
      
    } catch (error) {
      console.error(`  ❌ ERRO: ${error.message}`);
      summary.failed++;
      results.push({
        communityId: community.id,
        communityName: community.name,
        action: 'ERROR',
        result: 'error',
        error: error.message
      });
    }
  }
  
  // Salvar relatório
  const reportPath = join(AUDIT_DIR, 'rj_pipeline_apply.md');
  const report = generateApplyReport(results, summary, targetIds);
  writeFileSync(reportPath, report);
  
  console.log(`\n📄 Relatório salvo: ${reportPath}`);
  console.log(`\n📊 RESUMO FINAL:`);
  console.log(`  Processadas: ${summary.processed}`);
  console.log(`  Criadas: ${summary.created}`);
  console.log(`  Atualizadas: ${summary.updated}`);
  console.log(`  Puladas: ${summary.skipped}`);
  console.log(`  Falharam: ${summary.failed}`);
  console.log(`  Sem fonte: ${summary.noPolygon}`);
  
  return results;
}

/**
 * Gerar relatório dry-run
 */
function generateDryRunReport(results, summary, targetIds) {
  return `# RJ Geofence Pipeline - Dry Run Report

**Timestamp:** ${new Date().toISOString()}  
**Mode:** dry-run  
**Target IDs:** ${targetIds.length > 0 ? targetIds.length : 'ALL'}

## 📊 Summary

- **Processed:** ${summary.processed}
- **Would CREATE:** ${summary.wouldCreate}
- **Would UPDATE:** ${summary.wouldUpdate}
- **Would SKIP:** ${summary.wouldSkip}
- **Would FAIL:** ${summary.wouldFail}
- **No Polygon:** ${summary.noPolygon}

## 🎯 Results

${results.map(r => `- **${r.communityName}** (${r.communityId}) - ${r.action} - ${r.reason || r.source || 'N/A'}`).join('\n')}

## 📋 Next Steps

1. Review results above
2. Create allowlist: \`audit/rj_allowlist_ids.txt\`
3. Run: \`node scripts/rj_geofence_pipeline.js --apply --allowlist audit/rj_allowlist_ids.txt\`

---
Generated by RJ Geofence Pipeline
`;
}

/**
 * Gerar relatório apply
 */
function generateApplyReport(results, summary, targetIds) {
  const successful = results.filter(r => r.result === 'success');
  
  return `# RJ Geofence Pipeline - Apply Report

**Timestamp:** ${new Date().toISOString()}  
**Mode:** apply  
**Target IDs:** ${targetIds.length}

## 📊 Summary

- **Processed:** ${summary.processed}
- **Created:** ${summary.created}
- **Updated:** ${summary.updated}
- **Skipped:** ${summary.skipped}
- **Failed:** ${summary.failed}
- **No Polygon:** ${summary.noPolygon}

## ✅ Successful Applications

${successful.map(r => `- **${r.communityName}** (${r.communityId}) - ${r.action} - ${r.source || 'N/A'}`).join('\n')}

## 🔍 Validation Commands

\`\`\`bash
${successful.slice(0, 3).map(r => 
  `curl -s https://kaviar-v2.onrender.com/api/governance/communities/${r.communityId}/geofence | jq -r '.data.geometry.type'  # ${r.communityName}`
).join('\n')}
\`\`\`

---
Generated by RJ Geofence Pipeline
`;
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️ KAVIAR - RJ Geofence Pipeline (Idempotente)');
  console.log('===============================================');
  
  try {
    // 1. Buscar communities canônicas
    console.log('📡 Buscando communities canônicas...');
    const communities = await fetchCanonicalCommunities();
    console.log(`✅ ${communities.length} communities RJ encontradas`);
    
    if (isDryRun) {
      // 2a. Modo dry-run
      await processDryRun(communities, targetIds);
    } else if (isApply) {
      // 2b. Modo apply
      await processApply(communities, targetIds);
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

export { main };
