import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Guardrail: nunca rodar em production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERRO: Seed não pode ser executado em production!');
  process.exit(1);
}

const neighborhoods = [
  { name: 'Copacabana', lat: -22.9711, lng: -43.1822 },
  { name: 'Ipanema', lat: -22.9836, lng: -43.2074 },
  { name: 'Botafogo', lat: -22.9519, lng: -43.1900 },
  { name: 'Flamengo', lat: -22.9339, lng: -43.1746 },
  { name: 'Tijuca', lat: -22.9246, lng: -43.2325 },
  { name: 'Barra da Tijuca', lat: -23.0006, lng: -43.3659 },
  { name: 'Madureira', lat: -22.8747, lng: -43.3425 },
  { name: 'Campo Grande', lat: -22.9056, lng: -43.5615 },
  { name: 'Recreio', lat: -23.0278, lng: -43.4779 },
  { name: 'Centro', lat: -22.9035, lng: -43.2096 }
];

async function main() {
  console.log('🌱 Iniciando seed de drivers...');

  let count = 0;
  const now = new Date();

  for (const neighborhood of neighborhoods) {
    for (let i = 0; i < 5; i++) {
      count++;
      const phoneNumber = `+552199990${String(count).padStart(4, '0')}`;
      
      // Jitter pequeno (±0.003 graus ≈ ±330m)
      const jitterLat = (Math.random() - 0.5) * 0.006;
      const jitterLng = (Math.random() - 0.5) * 0.006;

      await prisma.drivers.create({
        data: {
          id: `seed-driver-${count}`,
          name: `Driver ${neighborhood.name} ${i + 1}`,
          email: `driver${count}@seed.kaviar.local`,
          phone: phoneNumber,
          status: 'active',
          last_lat: neighborhood.lat + jitterLat,
          last_lng: neighborhood.lng + jitterLng,
          last_location_updated_at: now,
          created_at: now,
          updated_at: now
        }
      });
    }
    console.log(`✅ ${neighborhood.name}: 5 drivers criados`);
  }

  console.log(`\n🎉 Seed completo! ${count} drivers criados.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
