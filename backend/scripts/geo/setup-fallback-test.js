#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupFallbackTest() {
  try {
    console.log('🔧 Setting up fallback test scenario...');
    
    // Find one approved driver
    const driver = await prisma.driver.findFirst({
      where: { status: 'approved' },
      select: { id: true, name: true, email: true }
    });

    if (!driver) {
      console.log('❌ No approved drivers found');
      return;
    }

    console.log(`📍 Found driver: ${driver.name} (${driver.id})`);

    // Set location OUTSIDE geofence areas (far from Rio)
    const outsideLocation = {
      lastLat: -22.0000, // Outside Rio neighborhoods
      lastLng: -43.0000,
      lastLocationUpdatedAt: new Date()
    };

    await prisma.driver.update({
      where: { id: driver.id },
      data: outsideLocation
    });

    console.log(`✅ Driver location set to: ${outsideLocation.lastLat}, ${outsideLocation.lastLng}`);
    console.log('🧪 Test scenario ready:');
    console.log('   - 1 driver with location OUTSIDE geofence');
    console.log('   - Ride requests inside communities should trigger fallback');
    
    // Verify the setup
    const updated = await prisma.driver.findUnique({
      where: { id: driver.id },
      select: { lastLat: true, lastLng: true, lastLocationUpdatedAt: true }
    });

    console.log('📊 Verification:', updated);
    console.log('\n🎯 Next: Test ride request inside community to trigger HTTP 202 + modal');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupFallbackTest();
}
