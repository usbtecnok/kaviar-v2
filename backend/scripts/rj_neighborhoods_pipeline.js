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
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Data.Rio official URL for RJ neighborhoods
const DATA_RIO_URL = 'https://www.data.rio/api/3/action/datastore_search?resource_id=2c2c7d34-8b3e-4c3e-9b4a-8b3e4c3e9b4a&limit=200';
const DATA_RIO_GEOJSON_URL = 'https://raw.githubusercontent.com/CodeForBrazil/dados-rio/main/geojson/bairros_rj.geojson';

// Download file from URL
async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const allArg = args.includes('--all');
const codbairroArg = args.find(a => a.startsWith('--codbairro='));
const namesArg = args.find(a => a.startsWith('--names='));
const allowlistArg = args.find(a => a.startsWith('--allowlist='));
const idsArg = args.find(a => a.startsWith('--ids='));
const geojsonArg = args.find(arg => arg.startsWith('--geojson='));

// Helper functions
function abort(msg) {
  console.log(`❌ ${msg}`);
  process.exit(1);
}

function parseCsvNumbers(csv) {
  return csv.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => Number(n))
    .filter(n => Number.isFinite(n));
}

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

    const codbairroRaw = props.CODBAIRRO ?? props.codBairro ?? props.codbairro ?? props.COD_BAIRRO;
    const codbairro = codbairroRaw != null ? Number(codbairroRaw) : null;

    neighborhoods.push({
      name: name.trim(),
      normalizedName: normalizeName(name),
      codbairro,
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

  // Require selector (safe-by-default)
  const hasSelector = !!(idsArg || codbairroArg || namesArg || allowlistArg || allArg);
  if (!hasSelector) {
    abort('Informe um seletor: --codbairro, --names, --allowlist, --ids ou use --all');
  }

  // Get GeoJSON file path
  const geojsonPath = geojsonArg?.split('=')[1] || 
                     args.find(arg => arg.includes('.geojson') && !arg.startsWith('--')) ||
                     process.env.RJ_NEIGHBORHOODS_GEOJSON_PATH;
  
  if (!geojsonPath) {
    console.log('❌ GeoJSON file required: --geojson /path/to/file.geojson ou RJ_NEIGHBORHOODS_GEOJSON_PATH env var');
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

  // Construct targets
  let targetNeighborhoods = allNeighborhoods;

  // CODBAIRRO has priority (safer)
  if (codbairroArg) {
    const wanted = new Set(parseCsvNumbers(codbairroArg.split('=')[1]));
    if (wanted.size === 0) abort('--codbairro inválido');

    const found = allNeighborhoods.filter(n => wanted.has(n.codbairro));

    // Validate exact set match
    if (found.length !== wanted.size) {
      const foundSet = new Set(found.map(n => n.codbairro));
      const missing = [...wanted].filter(x => !foundSet.has(x));
      abort(`CODBAIRRO não encontrado no GeoJSON: ${missing.join(', ')}`);
    }
    targetNeighborhoods = found;
  } else if (namesArg) {
    const wantedNames = namesArg.split('=')[1].split(',').map(s => s.trim());
    const wantedSet = new Set(wantedNames.map(normalizeName));

    // Map normalized -> list
    const map = new Map();
    for (const n of allNeighborhoods) {
      const key = n.normalizedName;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }

    const found = [];
    for (const wn of wantedSet) {
      const matches = map.get(wn) || [];
      if (matches.length === 0) abort(`Nome não encontrado: "${wn}"`);
      if (matches.length > 1) abort(`Nome ambíguo: "${wn}" (encontrados: ${matches.map(m => m.name).join(', ')})`);
      
      // Check for substring ambiguity (e.g., "rocha" matches both "rocha" and "rocha miranda")
      const allMatches = [];
      for (const [key, values] of map.entries()) {
        if (key.includes(wn) || wn.includes(key)) {
          allMatches.push(...values);
        }
      }
      if (allMatches.length > 1) {
        abort(`Nome ambíguo: "${wn}" (encontrados: ${allMatches.map(m => m.name).join(', ')})`);
      }
      
      found.push(matches[0]);
    }

    // Validate exact set match
    if (found.length !== wantedSet.size) abort('Mismatch de nomes');
    targetNeighborhoods = found;
  } else if (allowlistArg) {
    const allowlistPath = allowlistArg.split('=')[1];
    if (fs.existsSync(allowlistPath)) {
      const allowlistContent = fs.readFileSync(allowlistPath, 'utf8');
      const allowedItems = allowlistContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
      
      // Detect if CODBAIRRO list (all numbers) or names
      const isCodbairroList = allowedItems.length > 0 && allowedItems.every(item => /^\d+$/.test(item));
      
      if (isCodbairroList) {
        const wanted = new Set(allowedItems.map(Number));
        const found = allNeighborhoods.filter(n => wanted.has(n.codbairro));
        
        if (found.length !== wanted.size) {
          const foundSet = new Set(found.map(n => n.codbairro));
          const missing = [...wanted].filter(x => !foundSet.has(x));
          abort(`CODBAIRRO não encontrado no allowlist: ${missing.join(', ')}`);
        }
        targetNeighborhoods = found;
      } else {
        // Process as names with same validation
        const wantedSet = new Set(allowedItems.map(normalizeName));
        
        const map = new Map();
        for (const n of allNeighborhoods) {
          const key = n.normalizedName;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(n);
        }

        const found = [];
        for (const wn of wantedSet) {
          const matches = map.get(wn) || [];
          if (matches.length === 0) abort(`Nome não encontrado no allowlist: "${wn}"`);
          if (matches.length > 1) abort(`Nome ambíguo no allowlist: "${wn}" (encontrados: ${matches.map(m => m.name).join(', ')})`);
          
          // Check for substring ambiguity
          const allMatches = [];
          for (const [key, values] of map.entries()) {
            if (key.includes(wn) || wn.includes(key)) {
              allMatches.push(...values);
            }
          }
          if (allMatches.length > 1) {
            abort(`Nome ambíguo no allowlist: "${wn}" (encontrados: ${allMatches.map(m => m.name).join(', ')})`);
          }
          
          found.push(matches[0]);
        }
        
        if (found.length !== wantedSet.size) abort('Mismatch de nomes no allowlist');
        targetNeighborhoods = found;
      }
    } else {
      abort(`Allowlist file not found: ${allowlistPath}`);
    }
  } else if (idsArg) {
    const ids = idsArg.split('=')[1].split(',');
    targetNeighborhoods = allNeighborhoods.filter((_, index) => ids.includes(index.toString()));
  }
  // else: allArg is true, use all neighborhoods

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
