import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    nome?: string;
    name?: string;
    NOME?: string;
    bairro?: string;
    tipo?: string;
    zona?: string;
    populacao?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
}

interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

async function importGeoJSON(
  filePath: string,
  city: string,
  areaType: 'BAIRRO_OFICIAL' | 'COMUNIDADE' | 'FAVELA' | 'DISTRITO'
) {
  console.log(`\n📍 Importando ${areaType} de ${city} de ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  const geojson: GeoJSON = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let imported = 0;
  let skipped = 0;

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
      // Verificar se já existe
      const existing = await prisma.neighborhoods.findFirst({
        where: { name, city }
      });

      let neighborhoodId: string;

      if (existing) {
        // Atualizar tipo
        await prisma.neighborhoods.update({
          where: { id: existing.id },
          data: {
            area_type: areaType,
            zone: feature.properties.zona || existing.zone,
            population: feature.properties.populacao || existing.population
          }
        });
        neighborhoodId = existing.id;
        console.log(`✓ Atualizado: ${name}`);
      } else {
        // Criar novo
        const created = await prisma.neighborhoods.create({
          data: {
            name,
            city,
            area_type: areaType,
            zone: feature.properties.zona,
            population: feature.properties.populacao,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        neighborhoodId = created.id;
        console.log(`✓ Criado: ${name}`);
      }

      // Salvar geometria
      const geomWKT = convertToWKT(feature.geometry);
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO neighborhood_geofences (id, neighborhood_id, geom, created_at, updated_at)
        VALUES (gen_random_uuid(), '${neighborhoodId}', ST_GeomFromText('${geomWKT}', 4326), NOW(), NOW())
        ON CONFLICT (neighborhood_id) 
        DO UPDATE SET geom = ST_GeomFromText('${geomWKT}', 4326), updated_at = NOW()
      `);

      imported++;
    } catch (error) {
      console.error(`❌ Erro ao importar ${name}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Importação concluída:`);
  console.log(`   - Importados: ${imported}`);
  console.log(`   - Pulados: ${skipped}`);
}

function convertToWKT(geometry: any): string {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map((ring: any[]) => {
      const points = ring.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
      return `(${points})`;
    }).join(', ');
    return `POLYGON(${rings})`;
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.map((polygon: any[]) => {
      const rings = polygon.map((ring: any[]) => {
        const points = ring.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
        return `(${points})`;
      }).join(', ');
      return `(${rings})`;
    }).join(', ');
    return `MULTIPOLYGON(${polygons})`;
  }
  throw new Error(`Tipo de geometria não suportado: ${geometry.type}`);
}

async function main() {
  console.log('🗺️  KAVIAR - Importação de GeoJSONs');
  console.log('=====================================\n');

  const dataDir = path.join(__dirname, '../../data/geojson');

  // Importar bairros do Rio
  await importGeoJSON(
    path.join(dataDir, 'rio_bairros.geojson'),
    'Rio de Janeiro',
    'BAIRRO_OFICIAL'
  );

  // Importar favelas do Rio
  await importGeoJSON(
    path.join(dataDir, 'rio_favelas.geojson'),
    'Rio de Janeiro',
    'FAVELA'
  );

  // Importar distritos de São Paulo
  await importGeoJSON(
    path.join(dataDir, 'sp_distritos.geojson'),
    'São Paulo',
    'DISTRITO'
  );

  // Estatísticas finais
  console.log('\n📊 Estatísticas Finais:');
  const stats = await prisma.$queryRaw`
    SELECT city, area_type, COUNT(*) as total
    FROM neighborhoods
    GROUP BY city, area_type
    ORDER BY city, area_type
  `;
  console.table(stats);

  await prisma.$disconnect();
}

main().catch(console.error);
