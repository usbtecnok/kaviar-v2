const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const admins = [
  // SUPER_ADMIN
  { email: 'suporte@usbtecnok.com.br', password: 'z4939ia4', role: 'SUPER_ADMIN', name: 'Suporte USB Tecnok' },
  { email: 'financeiro@kaviar.com.br', password: 'z4939ia4', role: 'SUPER_ADMIN', name: 'Financeiro Kaviar' },
  
  // ANGEL_VIEWER
  { email: 'angel1@kaviar.com', password: 'z4939ia4', role: 'ANGEL_VIEWER', name: 'Angel Viewer 01' },
  { email: 'angel2@kaviar.com', password: 'rClu4a48Zeuc', role: 'ANGEL_VIEWER', name: 'Angel Viewer 02' },
  { email: 'angel3@kaviar.com', password: 'e2icCotMNos7', role: 'ANGEL_VIEWER', name: 'Angel Viewer 03' },
  { email: 'angel4@kaviar.com', password: 'TPT24kHn1KoC', role: 'ANGEL_VIEWER', name: 'Angel Viewer 04' },
  { email: 'angel5@kaviar.com', password: '88aRIIN3R0H4', role: 'ANGEL_VIEWER', name: 'Angel Viewer 05' },
  { email: 'angel6@kaviar.com', password: 'YZzkBcN49YdV', role: 'ANGEL_VIEWER', name: 'Angel Viewer 06' },
  { email: 'angel7@kaviar.com', password: 'nTuogoGr6aGD', role: 'ANGEL_VIEWER', name: 'Angel Viewer 07' },
  { email: 'angel8@kaviar.com', password: '2XmHMCQsJ0e1', role: 'ANGEL_VIEWER', name: 'Angel Viewer 08' },
  { email: 'angel9@kaviar.com', password: 'iJP09e8Qdoag', role: 'ANGEL_VIEWER', name: 'Angel Viewer 09' },
  { email: 'angel10@kaviar.com', password: 'lbeJQQphiXEi', role: 'ANGEL_VIEWER', name: 'Angel Viewer 10' },
];

async function upsertAdmins() {
  console.log('🔄 Iniciando upsert de admins...\n');

  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    
    await prisma.admins.upsert({
      where: { email: admin.email },
      update: {
        password: hashedPassword,
        role: admin.role,
        must_change_password: true,
        is_active: true,
      },
      create: {
        email: admin.email,
        password: hashedPassword,
        name: admin.name,
        role: admin.role,
        must_change_password: true,
        is_active: true,
      },
    });
    
    console.log(`✅ ${admin.email} (${admin.role})`);
  }

  console.log('\n📊 Validação:\n');

  // Contagem por role
  const counts = await prisma.$queryRaw`
    SELECT role, COUNT(*)::int as count 
    FROM admins 
    GROUP BY role 
    ORDER BY role
  `;
  
  console.log('Contagem por role:');
  counts.forEach(c => console.log(`  ${c.role}: ${c.count}`));
  console.log('');

  // Verificação dos campos
  const verification = await prisma.admins.findMany({
    where: {
      email: {
        in: admins.map(a => a.email)
      }
    },
    select: {
      email: true,
      role: true,
      must_change_password: true,
      is_active: true,
    },
    orderBy: [
      { role: 'desc' },
      { email: 'asc' }
    ]
  });

  console.log('Verificação dos 12 admins:');
  verification.forEach(v => {
    console.log(`  ${v.email.padEnd(30)} | ${v.role.padEnd(15)} | must_change: ${v.must_change_password} | active: ${v.is_active}`);
  });

  console.log('\n✅ 12 admins OK');
  
  await prisma.$disconnect();
}

upsertAdmins().catch(console.error);
