const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Vitrine Local V2: Aplicando migration aditiva...');

  // Novos campos em showcase_items
  await prisma.$executeRawUnsafe(`ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS exposure_quota INT`);
  console.log('  ✅ exposure_quota');

  await prisma.$executeRawUnsafe(`ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS exposure_used INT NOT NULL DEFAULT 0`);
  console.log('  ✅ exposure_used');

  await prisma.$executeRawUnsafe(`ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS clicks_count INT NOT NULL DEFAULT 0`);
  console.log('  ✅ clicks_count');

  await prisma.$executeRawUnsafe(`ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS last_shown_at TIMESTAMPTZ`);
  console.log('  ✅ last_shown_at');

  // Nova tabela showcase_events
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS showcase_events (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      item_id TEXT NOT NULL,
      passenger_id TEXT NOT NULL,
      ride_id TEXT,
      event_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(item_id, passenger_id, ride_id, event_type)
    )
  `);
  console.log('  ✅ showcase_events table');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_showcase_events_item_type ON showcase_events(item_id, event_type)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_showcase_events_item_created ON showcase_events(item_id, created_at)`);
  console.log('  ✅ indexes');

  // Verificar
  const cols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'showcase_items' AND column_name IN ('exposure_quota', 'exposure_used', 'clicks_count', 'last_shown_at')
    ORDER BY column_name
  `;
  console.log(`\n📊 Colunas verificadas: ${cols.map(c => c.column_name).join(', ')}`);

  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'showcase_events'
  `;
  console.log(`📊 Tabela showcase_events: ${tables.length > 0 ? 'OK' : 'FALHOU'}`);

  console.log('\n✅ Migration V2 concluída com sucesso');
}

migrate().catch(e => { console.error('❌ Migration falhou:', e); process.exit(1); }).finally(() => prisma.$disconnect());
