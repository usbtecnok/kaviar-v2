// KAVIAR - Análise Piloto Furnas/Agrícola/Mata Machado
// Data: 2026-02-21

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analisePiloto() {
  console.log('=== KAVIAR PILOTO - ANÁLISE DE TERRITÓRIO ===\n');

  try {
    // 1. COMUNIDADES
    console.log('=== 1. COMUNIDADES (Furnas/Agrícola/Mata Machado) ===');
    const communities = await prisma.communities.findMany({
      where: {
        OR: [
          { name: { contains: 'Furnas', mode: 'insensitive' } },
          { name: { contains: 'Agrícola', mode: 'insensitive' } },
          { name: { contains: 'Mata Machado', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        is_active: true,
        center_lat: true,
        center_lng: true,
        radius_meters: true,
        community_geofences: {
          select: {
            id: true,
            source: true,
            confidence: true,
            is_verified: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (communities.length === 0) {
      console.log('❌ Nenhuma comunidade encontrada\n');
    } else {
      communities.forEach((c) => {
        console.log(`\n📍 ${c.name}`);
        console.log(`   ID: ${c.id}`);
        console.log(`   Ativo: ${c.is_active ? '✅' : '❌'}`);
        console.log(`   Centro: ${c.center_lat}, ${c.center_lng}`);
        console.log(`   Raio: ${c.radius_meters}m`);
        console.log(`   Geofence PostGIS: ${c.community_geofences ? '✅' : '❌'}`);
        if (c.community_geofences) {
          console.log(`   - Source: ${c.community_geofences.source}`);
          console.log(`   - Confidence: ${c.community_geofences.confidence}`);
          console.log(`   - Verified: ${c.community_geofences.is_verified ? '✅' : '❌'}`);
        }
      });
    }

    console.log('\n');

    // 2. NEIGHBORHOODS (Bairros de BH)
    console.log('=== 2. NEIGHBORHOODS (Bairros de BH) ===');
    const neighborhoods = await prisma.neighborhoods.findMany({
      where: {
        city: 'Belo Horizonte',
        OR: [
          { name: { contains: 'Furnas', mode: 'insensitive' } },
          { name: { contains: 'Agrícola', mode: 'insensitive' } },
          { name: { contains: 'Mata Machado', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        is_active: true,
        center_lat: true,
        center_lng: true,
        neighborhood_geofences: {
          select: {
            id: true,
            source: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (neighborhoods.length === 0) {
      console.log('❌ Nenhum bairro encontrado\n');
    } else {
      neighborhoods.forEach((n) => {
        console.log(`\n📍 ${n.name} (${n.city})`);
        console.log(`   ID: ${n.id}`);
        console.log(`   Ativo: ${n.is_active ? '✅' : '❌'}`);
        console.log(`   Centro: ${n.center_lat}, ${n.center_lng}`);
        console.log(`   Geofence PostGIS: ${n.neighborhood_geofences ? '✅' : '❌'}`);
        if (n.neighborhood_geofences) {
          console.log(`   - Source: ${n.neighborhood_geofences.source}`);
        }
      });
    }

    console.log('\n');

    // 3. RESUMO GERAL
    console.log('=== 3. RESUMO GERAL ===');
    const totalCommunities = await prisma.communities.count();
    const activeCommunities = await prisma.communities.count({
      where: { is_active: true },
    });
    const communitiesWithGeofence = await prisma.community_geofences.count();

    const totalNeighborhoods = await prisma.neighborhoods.count({
      where: { city: 'Belo Horizonte' },
    });
    const activeNeighborhoods = await prisma.neighborhoods.count({
      where: { city: 'Belo Horizonte', is_active: true },
    });
    const neighborhoodsWithGeofence = await prisma.neighborhood_geofences.count({
      where: {
        neighborhoods: {
          city: 'Belo Horizonte',
        },
      },
    });

    console.log(`\nCommunities Total: ${totalCommunities} (${activeCommunities} ativos)`);
    console.log(`Communities com Geofence PostGIS: ${communitiesWithGeofence}`);
    console.log(`\nNeighborhoods BH Total: ${totalNeighborhoods} (${activeNeighborhoods} ativos)`);
    console.log(`Neighborhoods BH com Geofence PostGIS: ${neighborhoodsWithGeofence}`);

    console.log('\n=== ANÁLISE CONCLUÍDA ===');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analisePiloto();
