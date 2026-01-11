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

// Sample data for AP5 neighborhoods (would be replaced by real Data.Rio import)
const SAMPLE_NEIGHBORHOODS = [
  {
    name: 'Bangu',
    description: 'Bairro Bangu - Zona Oeste',
    zone: 'Zona Oeste',
    administrativeRegion: 'AP5',
    centerLat: -22.8791,
    centerLng: -43.4654,
    geofence: {
      type: 'Polygon',
      coordinates: [[[-43.4654, -22.8791], [-43.4600, -22.8791], [-43.4600, -22.8750], [-43.4654, -22.8750], [-43.4654, -22.8791]]]
    }
  },
  {
    name: 'Realengo',
    description: 'Bairro Realengo - Zona Oeste',
    zone: 'Zona Oeste',
    administrativeRegion: 'AP5',
    centerLat: -22.8850,
    centerLng: -43.4350,
    geofence: {
      type: 'Polygon',
      coordinates: [[[-43.4350, -22.8850], [-43.4300, -22.8850], [-43.4300, -22.8800], [-43.4350, -22.8800], [-43.4350, -22.8850]]]
    }
  },
  {
    name: 'Campo Grande',
    description: 'Bairro Campo Grande - Zona Oeste',
    zone: 'Zona Oeste',
    administrativeRegion: 'AP5',
    centerLat: -22.9000,
    centerLng: -43.5500,
    geofence: {
      type: 'Polygon',
      coordinates: [[[-43.5500, -22.9000], [-43.5450, -22.9000], [-43.5450, -22.8950], [-43.5500, -22.8950], [-43.5500, -22.9000]]]
    }
  },
  {
    name: 'Santa Cruz',
    description: 'Bairro Santa Cruz - Zona Oeste',
    zone: 'Zona Oeste',
    administrativeRegion: 'AP5',
    centerLat: -22.9200,
    centerLng: -43.6800,
    geofence: {
      type: 'Polygon',
      coordinates: [[[-43.6800, -22.9200], [-43.6750, -22.9200], [-43.6750, -22.9150], [-43.6800, -22.9150], [-43.6800, -22.9200]]]
    }
  },
  {
    name: 'Sepetiba',
    description: 'Bairro Sepetiba - Zona Oeste',
    zone: 'Zona Oeste',
    administrativeRegion: 'AP5',
    centerLat: -22.9700,
    centerLng: -43.7000,
    geofence: {
      type: 'Polygon',
      coordinates: [[[-43.7000, -22.9700], [-43.6950, -22.9700], [-43.6950, -22.9650], [-43.7000, -22.9650], [-43.7000, -22.9700]]]
    }
  }
];

async function main() {
  console.log('🏛️ KAVIAR - RJ Neighborhoods Pipeline (Idempotent)');
  console.log('===============================================');

  if (!isDryRun && !isApply) {
    console.log('❌ Modo requerido: --dry-run ou --apply');
    console.log('');
    console.log('Exemplos:');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --dry-run');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --apply --ids id1,id2,id3');
    console.log('  node scripts/rj_neighborhoods_pipeline.js --apply --allowlist audit/rj_neighborhoods_allowlist.txt');
    process.exit(1);
  }

  if (isApply && !idsArg && !allowlistArg) {
    console.log('❌ --apply requer --ids ou --allowlist');
    process.exit(1);
  }

  let targetNeighborhoods = [];
  
  if (idsArg) {
    const ids = idsArg.split('=')[1].split(',');
    targetNeighborhoods = SAMPLE_NEIGHBORHOODS.filter((_, index) => ids.includes(index.toString()));
  } else if (allowlistArg) {
    const allowlistPath = allowlistArg.split('=')[1];
    if (fs.existsSync(allowlistPath)) {
      const allowlistContent = fs.readFileSync(allowlistPath, 'utf8');
      const allowedNames = allowlistContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
      targetNeighborhoods = SAMPLE_NEIGHBORHOODS.filter(n => allowedNames.includes(n.name));
    } else {
      console.log(`❌ Allowlist file not found: ${allowlistPath}`);
      process.exit(1);
    }
  } else {
    targetNeighborhoods = SAMPLE_NEIGHBORHOODS;
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
          source: 'IPP_DATA_RIO_SAMPLE',
          area: 1000000, // Sample area
          perimeter: 4000 // Sample perimeter
        },
        update: {
          geofenceType: neighborhoodData.geofence.type,
          coordinates: neighborhoodData.geofence,
          source: 'IPP_DATA_RIO_SAMPLE',
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
  const report = generateReport(stats, targetNeighborhoods, isDryRun);
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Relatório salvo: ${reportPath}`);

  console.log('');
  console.log('🎉 Pipeline concluído com sucesso!');
}

function generateReport(stats, neighborhoods, isDryRun) {
  const timestamp = new Date().toISOString();
  const mode = isDryRun ? 'dry-run' : 'apply';
  
  return `# RJ Neighborhoods Pipeline - ${isDryRun ? 'Dry Run' : 'Apply'} Report

**Timestamp:** ${timestamp}  
**Mode:** ${mode}  
**Target Neighborhoods:** ${neighborhoods.length}

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
Generated by RJ Neighborhoods Pipeline
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
