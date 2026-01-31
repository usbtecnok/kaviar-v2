const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importGeoJSON(filePath, city, areaType) {
  console.log(`\n📍 Importando ${areaType} de ${city} de ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return { imported: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const feature of geojson.features) {
    const name = feature.properties.nome || 
                 feature.properties.name || 
                 feature.properties.NOME ||
                 feature.properties.bairro;

    if (!name) {
      console.log('⚠️  Feature sem nome, pulando...');
      skipped++;
      continue;
    }

    try {
      // Normalizar nome para match (remover acentos, lowercase)
      const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      
      // Buscar bairro existente (case-insensitive, sem acentos)
      const existing = await prisma.neighborhoods.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          city 
        }
      });

      if (!existing) {
        console.log(`⚠️  Bairro não encontrado no DB: ${name} (${city})`);
        skipped++;
        continue;
      }

      // Verificar se já tem geofence
      const existingGeofence = await prisma.neighborhood_geofences.findFirst({
        where: { neighborhood_id: existing.id }
      });

      // Converter geometria para WKT
      const geomWKT = convertToWKT(feature.geometry);
      
      if (existingGeofence) {
        // Atualizar
        await prisma.neighborhood_geofences.update({
          where: { id: existingGeofence.id },
          data: {
            geofence_type: areaType,
            coordinates: feature.geometry.coordinates,
            updated_at: new Date()
          }
        });
        
        // Atualizar geometria PostGIS
        await prisma.$executeRawUnsafe(`
          UPDATE neighborhood_geofences 
          SET geom = ST_GeomFromText('${geomWKT}', 4326)
          WHERE id = '${existingGeofence.id}'
        `);
        
        console.log(`✓ Atualizado: ${name}`);
        updated++;
      } else {
        // Criar novo
        const newGeofence = await prisma.neighborhood_geofences.create({
          data: {
            id: require('crypto').randomUUID(),
            neighborhood_id: existing.id,
            geofence_type: areaType,
            coordinates: feature.geometry.coordinates,
            source: 'GeoJSON Import',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        
        // Atualizar geometria PostGIS
        await prisma.$executeRawUnsafe(`
          UPDATE neighborhood_geofences 
          SET geom = ST_GeomFromText('${geomWKT}', 4326)
          WHERE id = '${newGeofence.id}'
        `);
        
        console.log(`✓ Criado: ${name}`);
        imported++;
      }
    } catch (error) {
      console.error(`❌ Erro ao importar ${name}:`, error.message);
      errors++;
    }
  }

  return { imported, updated, skipped, errors };
}

function convertToWKT(geometry) {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map(ring => {
      const points = ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
      return `(${points})`;
    }).join(', ');
    return `POLYGON(${rings})`;
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.map(polygon => {
      const rings = polygon.map(ring => {
        const points = ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
        return `(${points})`;
      }).join(', ');
      return `(${rings})`;
    }).join(', ');
    return `MULTIPOLYGON(${polygons})`;
  }
  throw new Error(`Tipo de geometria não suportado: ${geometry.type}`);
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗺️  KAVIAR - Importação de GeoJSONs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dataDir = path.join(__dirname, '../data/geojson');
  const stats = { imported: 0, updated: 0, skipped: 0, errors: 0 };

  // Importar bairros do Rio
  const rioResult = await importGeoJSON(
    path.join(dataDir, 'rio_bairros.geojson'),
    'Rio de Janeiro',
    'BAIRRO_OFICIAL'
  );
  stats.imported += rioResult.imported;
  stats.updated += rioResult.updated;
  stats.skipped += rioResult.skipped;
  stats.errors += rioResult.errors;

  // Nota: Arquivo rio_favelas.geojson está corrompido, pulando
  // Nota: São Paulo não tem geofences ainda, pulando

  // Estatísticas finais
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO FINAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Expected: 187 bairros`);
  console.log(`   Imported: ${stats.imported}`);
  console.log(`   Updated:  ${stats.updated}`);
  console.log(`   Skipped:  ${stats.skipped}`);
  console.log(`   Errors:   ${stats.errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Validação no DB
  const totalGeofences = await prisma.neighborhood_geofences.count();
  console.log(`\n✅ Total de geofences no DB: ${totalGeofences}`);

  const byCity = await prisma.$queryRaw`
    SELECT n.city, COUNT(ng.id) as total
    FROM neighborhoods n
    LEFT JOIN neighborhood_geofences ng ON ng.neighborhood_id = n.id
    WHERE ng.id IS NOT NULL
    GROUP BY n.city
    ORDER BY n.city
  `;
  
  console.log('\n📍 Por cidade:');
  byCity.forEach(row => console.log(`   ${row.city}: ${row.total}`));

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
