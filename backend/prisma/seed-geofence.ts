import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEOFENCE_COMMUNITIES = [
  {
    name: 'Furnas',
    description: 'Bairro Furnas - Zona Sul',
    centerLat: -22.9068,
    centerLng: -43.1729,
    radiusMeters: 1000,
    is_active: true
  },
  {
    name: 'Agrícola',
    description: 'Bairro Agrícola - Zona Norte',
    centerLat: -22.8968,
    centerLng: -43.1629,
    radiusMeters: 1200,
    is_active: true
  },
  {
    name: 'Mata Machado',
    description: 'Bairro Mata Machado - Centro',
    centerLat: -22.9168,
    centerLng: -43.1829,
    radiusMeters: 800,
    is_active: true
  }
];

async function seedGeofence() {
  console.log('🗺️  Seeding communities...');

  for (const community of GEOFENCE_COMMUNITIES) {
    const existing = await prisma.community.findFirst({
      where: { name: community.name }
    });

    if (existing) {
      await prisma.community.update({
        where: { id: existing.id },
        data: {
          centerLat: community.centerLat,
          centerLng: community.centerLng,
          radiusMeters: community.radiusMeters,
          isActive: community.is_active
        }
      });
      console.log(`   ✅ Updated: ${community.name}`);
    } else {
      await prisma.community.create({
        data: {
          name: community.name,
          description: community.description,
          centerLat: community.centerLat,
          centerLng: community.centerLng,
          radiusMeters: community.radiusMeters,
          isActive: community.is_active
        }
      });
      console.log(`   ✅ Created: ${community.name}`);
    }
  }

  console.log('🎯 Communities seed completed!');
}

if (require.main === module) {
  seedGeofence()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export default seedGeofence;
