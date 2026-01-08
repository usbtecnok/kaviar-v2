const { PrismaClient } = require('@prisma/client');

async function quickCheck() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRaw`SELECT PostGIS_Version()`;
    console.log('✅ PostGIS Version:', result[0].postgis_version);
  } catch (error) {
    console.log('❌ PostGIS Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
