#!/usr/bin/env node

/**
 * KAVIAR - RJ Neighborhoods Pipeline (Idempotent)
 * 
 * Import neighborhoods (bairros) from official IPP/Data.Rio source
 * 
 * Usage:
 *   node scripts/rj_neighborhoods_pipeline.js --dry-run
 *   node scripts/rj_neighborhoods_pipeline.js --apply --ids id1,id2,id3
 *   node scripts/rj_neighborhoods_pipeline.js --apply --allowlist audit/rj_neighborhoods_allowlist.txt
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const idsArg = args.find(arg => arg.startsWith('--ids='));
const allowlistArg = args.find(arg => arg.startsWith('--allowlist='));
const geojsonArg = args.find(arg => arg.startsWith('--geojson='));
const namesArg = args.find(arg => arg.startsWith('--names='));

// Normalize neighborhood name for matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Load neighborhoods from GeoJSON file
function loadNeighborhoodsFromGeoJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`GeoJSON file not found: ${filePath}`);
  }

  const geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (!geojsonData.features || !Array.isArray(geojsonData.features)) {
    throw new Error('Invalid GeoJSON: missing features array');
  }

  const neighborhoods = [];
  
  for (const feature of geojsonData.features) {
    if (!feature.geometry || !feature.properties) continue;
    
    // Only accept Polygon/MultiPolygon
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      continue;
    }

    const props = feature.properties;
    const name = props.nome || props.name || props.NOME || props.NAME;
    
    if (!name) continue;

    // Calculate center point (simple bbox center)
    const coords = feature.geometry.coordinates;
    let allCoords = [];
    
    if (feature.geometry.type === 'Polygon') {
      allCoords = coords[0];
    } else if (feature.geometry.type === 'MultiPolygon') {
      allCoords = coords[0][0];
    }
    
    const lats = allCoords.map(c => c[1]);
    const lngs = allCoords.map(c => c[0]);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    neighborhoods.push({
      name: name.trim(),
      normalizedName: normalizeName(name),
      description: `Bairro ${name} - Rio de Janeiro`,
      zone: props.zona || props.zone || 'Rio de Janeiro',
      administrativeRegion: props.ap || props.AP || 'RJ',
      centerLat,
      centerLng,
      geofence: feature.geometry,
      source: 'IPP_DATA_RIO_GEOJSON'
    });
  }

  return neighborhoods;
}

async function main() {
  console.log('🏛️ KAVIAR - RJ Neighborhoods Pipeline (Idempotent)');
  console.log('===============================================');

  if (!isDryRun && !isApply) {
    console.log('❌ Modo requerido: --dry-run ou --apply');
    console.log('');
    console.log('Exemplos:');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --dry-run --geojson /path/to/bairros.geojson');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --apply --geojson /path/to/bairros.geojson --names "Bangu,Realengo"');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --apply --geojson /path/to/bairros.geojson --allowlist audit/rj_neighborhoods_allowlist.txt');
    process.exit(1);
  }

  // Get GeoJSON file path
  const geojsonPath = geojsonArg?.split('=')[1] || process.env.RJ_NEIGHBORHOODS_GEOJSON_PATH;
  
  if (!geojsonPath) {
    console.log('❌ GeoJSON file required: --geojson /path/to/file.geojson ou RJ_NEIGHBORHOODS_GEOJSON_PATH env var');
    process.exit(1);
  }

  if (isApply && !idsArg && !allowlistArg && !namesArg) {
    console.log('❌ --apply requer --ids, --names ou --allowlist');
    process.exit(1);
  }

  console.log(`📁 Carregando GeoJSON: ${geojsonPath}`);
  
  let allNeighborhoods;
  try {
    allNeighborhoods = loadNeighborhoodsFromGeoJSON(geojsonPath);
  } catch (error) {
    console.log(`❌ Erro ao carregar GeoJSON: ${error.message}`);
    process.exit(1);
  }

  console.log(`📊 ${allNeighborhoods.length} bairros carregados do GeoJSON`);

  let targetNeighborhoods = [];
  
  if (idsArg) {
    const ids = idsArg.split('=')[1].split(',');
    targetNeighborhoods = allNeighborhoods.filter((_, index) => ids.includes(index.toString()));
  } else if (namesArg) {
    const targetNames = namesArg.split('=')[1].split(',').map(name => name.trim());
    const normalizedTargets = targetNames.map(normalizeName);
    
    targetNeighborhoods = allNeighborhoods.filter(n => 
      normalizedTargets.some(target => n.normalizedName.includes(target) || target.includes(n.normalizedName))
    );
    
    console.log(`🎯 Buscando por: ${targetNames.join(', ')}`);
    console.log(`📍 Encontrados: ${targetNeighborhoods.map(n => n.name).join(', ')}`);
    
  } else if (allowlistArg) {
    const allowlistPath = allowlistArg.split('=')[1];
    if (fs.existsSync(allowlistPath)) {
      const allowlistContent = fs.readFileSync(allowlistPath, 'utf8');
      const allowedNames = allowlistContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
      
      const normalizedAllowed = allowedNames.map(normalizeName);
      targetNeighborhoods = allNeighborhoods.filter(n => 
        normalizedAllowed.some(target => n.normalizedName.includes(target) || target.includes(n.normalizedName))
      );
    } else {
      console.log(`❌ Allowlist file not found: ${allowlistPath}`);
      process.exit(1);
    }
  } else {
    targetNeighborhoods = allNeighborhoods;
  }

  console.log(`🧪 MODO ${isDryRun ? 'DRY-RUN' : 'APPLY'} - Processando ${targetNeighborhoods.length} bairros...`);
  console.log('');

  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  for (const neighborhoodData of targetNeighborhoods) {
    console.log(`📍 ${neighborhoodData.name}`);
    
    try {
      // Check if neighborhood exists
      const existing = await prisma.neighborhood.findUnique({
        where: { name: neighborhoodData.name },
        include: { geofenceData: true }
      });

      if (existing && existing.geofenceData) {
        console.log(`  ⏭️ SKIP - Already has geofence`);
        stats.skipped++;
        continue;
      }

      if (isDryRun) {
        if (existing) {
          console.log(`  📊 Would UPDATE geofence`);
        } else {
          console.log(`  📊 Would CREATE neighborhood + geofence`);
        }
        continue;
      }

      // Apply mode - create or update
      let neighborhood;
      if (existing) {
        neighborhood = existing;
        console.log(`  ✅ UPDATE geofence`);
        stats.updated++;
      } else {
        neighborhood = await prisma.neighborhood.create({
          data: {
            name: neighborhoodData.name,
            description: neighborhoodData.description,
            zone: neighborhoodData.zone,
            administrativeRegion: neighborhoodData.administrativeRegion,
            centerLat: neighborhoodData.centerLat,
            centerLng: neighborhoodData.centerLng
          }
        });
        console.log(`  ✅ CREATE neighborhood`);
        stats.created++;
      }

      // Create or update geofence
      await prisma.neighborhoodGeofence.upsert({
        where: { neighborhoodId: neighborhood.id },
        create: {
          neighborhoodId: neighborhood.id,
          geofenceType: neighborhoodData.geofence.type,
          coordinates: neighborhoodData.geofence,
          source: neighborhoodData.source || 'IPP_DATA_RIO_GEOJSON',
          area: 1000000, // Will be calculated properly in production
          perimeter: 4000 // Will be calculated properly in production
        },
        update: {
          geofenceType: neighborhoodData.geofence.type,
          coordinates: neighborhoodData.geofence,
          source: neighborhoodData.source || 'IPP_DATA_RIO_GEOJSON',
          area: 1000000,
          perimeter: 4000
        }
      });

      stats.processed++;

    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      stats.failed++;
    }
  }

  console.log('');
  console.log('📊 RESUMO:');
  console.log(`  Processados: ${stats.processed}`);
  console.log(`  Criados: ${stats.created}`);
  console.log(`  Atualizados: ${stats.updated}`);
  console.log(`  Pulados: ${stats.skipped}`);
  console.log(`  Falharam: ${stats.failed}`);

  // Generate report
  const reportPath = path.join(__dirname, '..', 'audit', `rj_neighborhoods_${isDryRun ? 'dry_run' : 'apply'}_${Date.now()}.md`);
  const report = generateReport(stats, targetNeighborhoods, isDryRun, allNeighborhoods?.length || 0);
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Relatório salvo: ${reportPath}`);

  console.log('');
  console.log('🎉 Pipeline concluído com sucesso!');
}

function generateReport(stats, neighborhoods, isDryRun, totalLoaded = 0) {
  const timestamp = new Date().toISOString();
  const mode = isDryRun ? 'dry-run' : 'apply';
  
  return `# RJ Neighborhoods Pipeline - ${isDryRun ? 'Dry Run' : 'Apply'} Report

**Timestamp:** ${timestamp}  
**Mode:** ${mode}  
**Total Features Loaded:** ${totalLoaded}
**Target Neighborhoods:** ${neighborhoods.length}
**Matched:** ${neighborhoods.length}
**Failed:** ${stats.failed}

## 📊 Summary

- **Processed:** ${stats.processed}
- **Created:** ${stats.created}
- **Updated:** ${stats.updated}
- **Skipped:** ${stats.skipped}
- **Failed:** ${stats.failed}

## 🎯 Neighborhoods

${neighborhoods.map(n => `- **${n.name}** (${n.zone} - ${n.administrativeRegion})`).join('\n')}

## 📋 Next Steps

${isDryRun ? 
  '1. Review results above\n2. Run with --apply to execute changes' :
  '1. Verify results with GET /api/governance/neighborhoods\n2. Test geofence endpoints'
}

---
Generated by RJ Neighborhoods Pipeline (GeoJSON Source)
`;
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n🛑 Pipeline interrompido pelo usuário');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Run main function
main()
  .catch(async (e) => {
    console.error('❌ Erro fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
