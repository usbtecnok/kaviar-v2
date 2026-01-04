const { PrismaClient } = require("@prisma/client");

function maskDbUrl(url = "") {
  return url
    .replace(/\/\/([^:]+):([^@]+)@/g, "//***:***@")
    .replace(/(password=)([^&]+)/gi, "$1***");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    console.error("❌ DATABASE_URL não encontrada no ambiente.");
    process.exit(1);
  }

  console.log("🔗 DATABASE_URL:", maskDbUrl(dbUrl));

  const prisma = new PrismaClient();

  try {
    const ok = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log("✅ Conectividade OK:", ok?.[0]?.ok ?? ok);

    const tables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
    console.log("✅ Tabelas encontradas:", Array.isArray(tables) ? tables.length : "??");
    console.log("📋 Lista de tabelas:", tables.map((t) => t.tablename).join(", "));

    const [drivers, rides, tourPackages] = await Promise.all([
      prisma.driver.count(),
      prisma.ride.count(),
      prisma.tourPackage.count(),
    ]);

    console.log("✅ Models funcionando:");
    console.log("   - Drivers:", drivers);
    console.log("   - Rides:", rides);
    console.log("   - Tour Packages:", tourPackages);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Falha na validação:", err?.message || err);
  process.exit(1);
});
