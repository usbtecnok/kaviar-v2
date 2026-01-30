const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// São Paulo neighborhoods data - Major districts
const saoPauloNeighborhoods = [
  // Zona Central
  { name: 'Sé', zone: 'Centro', administrative_region: 'Centro', center_lat: -23.5505, center_lng: -46.6333 },
  { name: 'República', zone: 'Centro', administrative_region: 'Centro', center_lat: -23.5431, center_lng: -46.6431 },
  { name: 'Consolação', zone: 'Centro', administrative_region: 'Centro', center_lat: -23.5558, center_lng: -46.6606 },
  { name: 'Bela Vista', zone: 'Centro', administrative_region: 'Centro', center_lat: -23.5614, center_lng: -46.6425 },
  { name: 'Liberdade', zone: 'Centro', administrative_region: 'Centro', center_lat: -23.5589, center_lng: -46.6344 },
  
  // Zona Sul
  { name: 'Vila Mariana', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.5881, center_lng: -46.6389 },
  { name: 'Moema', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.6028, center_lng: -46.6639 },
  { name: 'Brooklin', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.6111, center_lng: -46.6972 },
  { name: 'Itaim Bibi', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.5906, center_lng: -46.6789 },
  { name: 'Jabaquara', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.6467, center_lng: -46.6417 },
  { name: 'Santo Amaro', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.6528, center_lng: -46.7056 },
  { name: 'Campo Belo', zone: 'Zona Sul', administrative_region: 'Sul', center_lat: -23.6194, center_lng: -46.6722 },
  
  // Zona Oeste
  { name: 'Pinheiros', zone: 'Zona Oeste', administrative_region: 'Oeste', center_lat: -23.5656, center_lng: -46.6822 },
  { name: 'Perdizes', zone: 'Zona Oeste', administrative_region: 'Oeste', center_lat: -23.5378, center_lng: -46.6739 },
  { name: 'Lapa', zone: 'Zona Oeste', administrative_region: 'Oeste', center_lat: -23.5281, center_lng: -46.7017 },
  { name: 'Butantã', zone: 'Zona Oeste', administrative_region: 'Oeste', center_lat: -23.5711, center_lng: -46.7261 },
  { name: 'Vila Leopoldina', zone: 'Zona Oeste', administrative_region: 'Oeste', center_lat: -23.5289, center_lng: -46.7339 },
  
  // Zona Norte
  { name: 'Santana', zone: 'Zona Norte', administrative_region: 'Norte', center_lat: -23.5022, center_lng: -46.6289 },
  { name: 'Tucuruvi', zone: 'Zona Norte', administrative_region: 'Norte', center_lat: -23.4794, center_lng: -46.6028 },
  { name: 'Vila Maria', zone: 'Zona Norte', administrative_region: 'Norte', center_lat: -23.5089, center_lng: -46.5878 },
  { name: 'Casa Verde', zone: 'Zona Norte', administrative_region: 'Norte', center_lat: -23.5156, center_lng: -46.6556 },
  { name: 'Jaçanã', zone: 'Zona Norte', administrative_region: 'Norte', center_lat: -23.4622, center_lng: -46.6194 },
  
  // Zona Leste
  { name: 'Tatuapé', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5406, center_lng: -46.5772 },
  { name: 'Mooca', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5506, center_lng: -46.5989 },
  { name: 'Vila Prudente', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5906, center_lng: -46.5822 },
  { name: 'Penha', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5289, center_lng: -46.5411 },
  { name: 'São Miguel Paulista', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.4981, center_lng: -46.4439 },
  { name: 'Itaquera', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5406, center_lng: -46.4564 },
  { name: 'Guaianases', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.5406, center_lng: -46.4039 },
  { name: 'Cidade Tiradentes', zone: 'Zona Leste', administrative_region: 'Leste', center_lat: -23.6006, center_lng: -46.4028 }
];

async function seedSaoPaulo() {
  console.log('🌆 Iniciando seed de bairros de São Paulo...\n');

  let created = 0;
  let skipped = 0;

  for (const neighborhood of saoPauloNeighborhoods) {
    try {
      const existing = await prisma.neighborhoods.findFirst({
        where: {
          name: neighborhood.name,
          city: 'São Paulo'
        }
      });

      if (existing) {
        console.log(`⏭️  ${neighborhood.name} já existe`);
        skipped++;
        continue;
      }

      await prisma.neighborhoods.create({
        data: {
          id: require('crypto').randomUUID(),
          name: neighborhood.name,
          city: 'São Paulo',
          zone: neighborhood.zone,
          administrative_region: neighborhood.administrative_region,
          center_lat: neighborhood.center_lat,
          center_lng: neighborhood.center_lng,
          is_active: true,
          is_verified: true,
          verified_at: new Date(),
          verified_by: 'system',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      console.log(`✅ ${neighborhood.name} (${neighborhood.zone})`);
      created++;
    } catch (error) {
      console.error(`❌ Erro ao criar ${neighborhood.name}:`, error.message);
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Criados: ${created}`);
  console.log(`   ⏭️  Ignorados: ${skipped}`);
  console.log(`   📍 Total: ${saoPauloNeighborhoods.length}`);

  // Verificar totais por cidade
  const rjCount = await prisma.neighborhoods.count({
    where: { city: 'Rio de Janeiro' }
  });
  const spCount = await prisma.neighborhoods.count({
    where: { city: 'São Paulo' }
  });

  console.log(`\n🏙️  Bairros por cidade:`);
  console.log(`   Rio de Janeiro: ${rjCount}`);
  console.log(`   São Paulo: ${spCount}`);
}

seedSaoPaulo()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
