const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const now = new Date();
  const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const item = await p.showcase_items.create({
    data: {
      title: 'Vitrine Local KAVIAR',
      description: 'Em breve, comércios, associações e parceiros da sua região poderão divulgar avisos e serviços úteis aqui.',
      icon: '📍',
      type: 'notice',
      community_id: null,
      neighborhood_id: null,
      cta_label: 'Falar com o KAVIAR',
      cta_url: 'https://wa.me/5521968648777?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20a%20Vitrine%20Local%20KAVIAR',
      is_active: true,
      priority: 1,
      starts_at: now,
      ends_at: ends,
      approved_at: now,
      approved_by: 'system-seed',
      created_by: 'system-seed',
    },
  });

  console.log('✅ Anúncio criado:', JSON.stringify({ id: item.id, title: item.title, is_active: item.is_active, approved_at: item.approved_at, starts_at: item.starts_at, ends_at: item.ends_at }));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
