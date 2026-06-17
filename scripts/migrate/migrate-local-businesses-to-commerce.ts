/**
 * migrate-local-businesses-to-commerce.ts
 *
 * Migra registros de local_businesses para commerce_accounts.
 * - Idempotente: não duplica se rodar mais de uma vez (match por name + territory_id).
 * - Modo dry-run por padrão (--execute para gravar).
 * - Registros sem territory_id definido são reportados, não migrados.
 *
 * Uso:
 *   npx ts-node scripts/migrate/migrate-local-businesses-to-commerce.ts          # dry-run
 *   npx ts-node scripts/migrate/migrate-local-businesses-to-commerce.ts --execute # executa
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = !process.argv.includes('--execute');

async function main() {
  console.log(`\n🔄 Migração: local_businesses → commerce_accounts`);
  console.log(`   Modo: ${dryRun ? 'DRY-RUN (nenhuma alteração será feita)' : '⚡ EXECUTANDO'}\n`);

  const businesses = await prisma.local_businesses.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`📦 Total de registros em local_businesses: ${businesses.length}\n`);

  // Buscar territórios para resolver region_slug → territory_id
  const territories = await prisma.operational_territories.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, city_name: true, uf: true },
  });

  const slugify = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Buscar commerce_accounts existentes para verificar duplicidade
  const existingAccounts = await prisma.commerce_accounts.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true, territory_id: true },
  });
  const existingKey = new Set(
    existingAccounts.map(a => `${a.name.trim().toLowerCase()}|${a.territory_id || ''}`)
  );

  let migrated = 0;
  let skippedDuplicate = 0;
  let skippedNoTerritory = 0;
  const report: { name: string; reason: string }[] = [];

  for (const biz of businesses) {
    // Resolve territory_id
    let territoryId = biz.territory_id;

    if (!territoryId && biz.region_slug) {
      // Tentar resolver region_slug para um territory via city_name ou name match
      const slug = biz.region_slug.toLowerCase();
      const match = territories.find(t => {
        if (t.city_name && slugify(t.city_name) === slug) return true;
        if (slugify(t.name) === slug) return true;
        return false;
      });
      if (match) {
        territoryId = match.id;
      }
    }

    if (!territoryId) {
      skippedNoTerritory++;
      report.push({ name: biz.name, reason: `Sem territory_id e region_slug="${biz.region_slug}" não mapeável` });
      continue;
    }

    // Verificar duplicidade
    const key = `${biz.name.trim().toLowerCase()}|${territoryId}`;
    if (existingKey.has(key)) {
      skippedDuplicate++;
      console.log(`  ⏭️  DUPLICADO: "${biz.name}" (territory: ${territoryId})`);
      continue;
    }

    console.log(`  ${dryRun ? '🔍' : '✅'} ${dryRun ? 'MIGRARIA' : 'MIGRANDO'}: "${biz.name}" → territory ${territoryId} (is_active: ${biz.is_active})`);

    if (!dryRun) {
      await prisma.commerce_accounts.create({
        data: {
          name: biz.name,
          category: biz.category || 'outro',
          phone: biz.whatsapp || null,
          address: biz.address || null,
          territory_id: territoryId,
          is_active: biz.is_active,
          logo_url: biz.logo_url || null,
        },
      });
      existingKey.add(key);
    }

    migrated++;
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`📊 Resultado:`);
  console.log(`   ${dryRun ? 'Seriam migrados' : 'Migrados'}: ${migrated}`);
  console.log(`   Duplicados (já existem): ${skippedDuplicate}`);
  console.log(`   Sem território (não migrados): ${skippedNoTerritory}`);

  if (report.length > 0) {
    console.log(`\n⚠️  Registros não migrados (requerem correção manual):`);
    for (const r of report) {
      console.log(`   • "${r.name}" — ${r.reason}`);
    }
  }

  if (dryRun) {
    console.log(`\n💡 Para executar a migração, rode com --execute`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erro na migração:', e);
  prisma.$disconnect();
  process.exit(1);
});
