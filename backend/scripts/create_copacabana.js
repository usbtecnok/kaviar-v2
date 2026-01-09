const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCopacabana() {
  console.log('🏖️ CRIANDO COPACABANA - PADRÃO OURO');
  console.log('===================================');

  try {
    // Verificar se já existe
    const existing = await prisma.community.findFirst({
      where: { name: { contains: 'Copacabana', mode: 'insensitive' } }
    });

    if (existing) {
      console.log('✅ Copacabana já existe:', existing.name);
      return existing;
    }

    // Criar Copacabana
    const copacabana = await prisma.community.create({
      data: {
        name: 'Copacabana',
        isActive: true,
        centerLat: -22.9711,
        centerLng: -43.1822
      }
    });

    console.log('✅ Copacabana criada:', copacabana.id);

    // Criar geofence para Copacabana (polígono aproximado)
    const copacabanaGeofence = {
      type: "Polygon",
      coordinates: [[
        [-43.1900, -22.9600], // NW
        [-43.1700, -22.9600], // NE  
        [-43.1700, -22.9800], // SE
        [-43.1900, -22.9800], // SW
        [-43.1900, -22.9600]  // Close
      ]]
    };

    const geofence = await prisma.communityGeofence.create({
      data: {
        communityId: copacabana.id,
        centerLat: copacabana.centerLat,
        centerLng: copacabana.centerLng,
        minLat: -22.9800,
        minLng: -43.1900,
        maxLat: -22.9600,
        maxLng: -43.1700,
        geojson: JSON.stringify(copacabanaGeofence),
        source: 'manual',
        sourceRef: 'copacabana_padrao_ouro',
        confidence: 'HIGH',
        isVerified: true,
        reviewNotes: 'Criado como padrão ouro para testes'
      }
    });

    console.log('✅ Geofence criado:', geofence.id);

    // Criar comunidades associadas (favelas próximas)
    const comunidadesAssociadas = [
      {
        name: 'Morro do Cantagalo',
        centerLat: -22.9750,
        centerLng: -43.1850
      },
      {
        name: 'Pavão-Pavãozinho',
        centerLat: -22.9780,
        centerLng: -43.1870
      }
    ];

    for (const comunidade of comunidadesAssociadas) {
      // Verificar se já existe
      const existingCom = await prisma.community.findFirst({
        where: { name: comunidade.name }
      });

      if (!existingCom) {
        const created = await prisma.community.create({
          data: {
            name: comunidade.name,
            isActive: true,
            centerLat: comunidade.centerLat,
            centerLng: comunidade.centerLng
          }
        });
        console.log(`✅ ${comunidade.name} criada:`, created.id);
      } else {
        console.log(`ℹ️ ${comunidade.name} já existe`);
      }
    }

    console.log('\n🎯 COPACABANA PADRÃO OURO RESTAURADO');
    return copacabana;

  } catch (error) {
    console.error('❌ Erro ao criar Copacabana:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createCopacabana().catch(console.error);
}

module.exports = { createCopacabana };
