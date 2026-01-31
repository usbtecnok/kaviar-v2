const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Coordenadas aproximadas dos centros dos bairros de São Paulo
const SP_CENTERS = {
  'Aclimação': { lat: -23.5733, lng: -46.6336 },
  'Água Branca': { lat: -23.5267, lng: -46.6889 },
  'Alto de Pinheiros': { lat: -23.5456, lng: -46.7089 },
  'Barra Funda': { lat: -23.5267, lng: -46.6656 },
  'Bela Vista': { lat: -23.5589, lng: -46.6456 },
  'Brooklin': { lat: -23.6156, lng: -46.6956 },
  'Butantã': { lat: -23.5689, lng: -46.7289 },
  'Campo Belo': { lat: -23.6189, lng: -46.6756 },
  'Cerqueira César': { lat: -23.5589, lng: -46.6656 },
  'Consolação': { lat: -23.5522, lng: -46.6522 },
  'Higienópolis': { lat: -23.5456, lng: -46.6522 },
  'Itaim Bibi': { lat: -23.5889, lng: -46.6789 },
  'Jardim América': { lat: -23.5722, lng: -46.6822 },
  'Jardim Europa': { lat: -23.5756, lng: -46.6889 },
  'Jardim Paulista': { lat: -23.5656, lng: -46.6656 },
  'Lapa': { lat: -23.5189, lng: -46.7022 },
  'Liberdade': { lat: -23.5589, lng: -46.6322 },
  'Moema': { lat: -23.6022, lng: -46.6656 },
  'Morumbi': { lat: -23.6189, lng: -46.7189 },
  'Pacaembu': { lat: -23.5389, lng: -46.6656 },
  'Perdizes': { lat: -23.5356, lng: -46.6756 },
  'Pinheiros': { lat: -23.5656, lng: -46.6889 },
  'República': { lat: -23.5456, lng: -46.6422 },
  'Santa Cecília': { lat: -23.5389, lng: -46.6522 },
  'Santana': { lat: -23.5022, lng: -46.6289 },
  'Santo Amaro': { lat: -23.6522, lng: -46.7089 },
  'Saúde': { lat: -23.6189, lng: -46.6389 },
  'Tatuapé': { lat: -23.5389, lng: -46.5756 },
  'Vila Mariana': { lat: -23.5889, lng: -46.6389 },
  'Vila Olímpia': { lat: -23.5956, lng: -46.6889 }
};

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 ATUALIZANDO COORDENADAS DOS BAIRROS DE SÃO PAULO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  let updated = 0;
  let notFound = 0;

  for (const [name, coords] of Object.entries(SP_CENTERS)) {
    try {
      const neighborhood = await prisma.neighborhoods.findFirst({
        where: { name, city: 'São Paulo' }
      });

      if (!neighborhood) {
        console.log(`⚠️  Não encontrado: ${name}`);
        notFound++;
        continue;
      }

      await prisma.neighborhoods.update({
        where: { id: neighborhood.id },
        data: {
          center_lat: coords.lat,
          center_lng: coords.lng,
          updated_at: new Date()
        }
      });

      console.log(`✓ Atualizado: ${name} (${coords.lat}, ${coords.lng})`);
      updated++;
    } catch (error) {
      console.error(`❌ Erro ao atualizar ${name}:`, error.message);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESUMO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Atualizados: ${updated}`);
  console.log(`   Não encontrados: ${notFound}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
