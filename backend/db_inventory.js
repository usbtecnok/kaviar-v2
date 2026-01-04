const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log("=== TABELAS ===");
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
  `;
  tables.forEach(row => console.log(row.tablename));
  
  console.log("\n=== COLUNAS POR TABELA ===");
  const columns = await prisma.$queryRaw`
    SELECT table_name, count(*) as cols
    FROM information_schema.columns
    WHERE table_schema='public'
    GROUP BY table_name
    ORDER BY table_name;
  `;
  columns.forEach(row => console.log(`${row.table_name}: ${row.cols} colunas`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
