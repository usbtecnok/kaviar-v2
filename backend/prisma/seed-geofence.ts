import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEOFENCE_COMMUNITIES = [
  {
    name: 'Furnas',
    description: 'Bairro Furnas - Zona Sul',
    centerLat: -22.9068,
    centerLng: -43.1729,
    radiusMeters: 1000,
    // Polígono de exemplo para Furnas (Rio de Janeiro)
    geofence: {
      type: 'polygon',
      path: [
        { lat: -22.9058, lng: -43.1739 },
        { lat: -22.9058, lng: -43.1719 },
        { lat: -22.9078, lng: -43.1719 },
        { lat: -22.9078, lng: -43.1739 },
        { lat: -22.9058, lng: -43.1739 }
      ]
    },
    is_active: true
  },
  {
    name: 'Agrícola',
    description: 'Bairro Agrícola - Zona Norte',
    centerLat: -22.8968,
    centerLng: -43.1629,
    radiusMeters: 1200,
    // Polígono de exemplo para Agrícola
    geofence: {
      type: 'polygon',
      path: [
        { lat: -22.8958, lng: -43.1639 },
        { lat: -22.8958, lng: -43.1619 },
        { lat: -22.8978, lng: -43.1619 },
        { lat: -22.8978, lng: -43.1639 },
        { lat: -22.8958, lng: -43.1639 }
      ]
    },
    is_active: true
  },
  {
    name: 'Mata Machado',
    description: 'Bairro Mata Machado - Centro',
    centerLat: -22.9168,
    centerLng: -43.1829,
    radiusMeters: 800,
    // Polígono de exemplo para Mata Machado
    geofence: {
      type: 'polygon',
      path: [
        { lat: -22.9158, lng: -43.1839 },
        { lat: -22.9158, lng: -43.1819 },
        { lat: -22.9178, lng: -43.1819 },
        { lat: -22.9178, lng: -43.1839 },
        { lat: -22.9158, lng: -43.1839 }
      ]
    },
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
          geofence: JSON.stringify(community.geofence),
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
          geofence: JSON.stringify(community.geofence),
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
