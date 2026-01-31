const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

// Gerar senha temporária forte
function generateStrongPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 20; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  return password;
}

const admins = [
  // SUPER_ADMIN (2)
  { email: 'suporte@kaviar.com.br', name: 'Suporte Kaviar', role: 'SUPER_ADMIN' },
  { email: 'financeiro@kaviar.com.br', name: 'Financeiro Kaviar', role: 'SUPER_ADMIN' },
  // ANGEL_VIEWER (10)
  { email: 'angel01@kaviar.com.br', name: 'Angel Viewer 01', role: 'ANGEL_VIEWER' },
  { email: 'angel02@kaviar.com.br', name: 'Angel Viewer 02', role: 'ANGEL_VIEWER' },
  { email: 'angel03@kaviar.com.br', name: 'Angel Viewer 03', role: 'ANGEL_VIEWER' },
  { email: 'angel04@kaviar.com.br', name: 'Angel Viewer 04', role: 'ANGEL_VIEWER' },
  { email: 'angel05@kaviar.com.br', name: 'Angel Viewer 05', role: 'ANGEL_VIEWER' },
  { email: 'angel06@kaviar.com.br', name: 'Angel Viewer 06', role: 'ANGEL_VIEWER' },
  { email: 'angel07@kaviar.com.br', name: 'Angel Viewer 07', role: 'ANGEL_VIEWER' },
  { email: 'angel08@kaviar.com.br', name: 'Angel Viewer 08', role: 'ANGEL_VIEWER' },
  { email: 'angel09@kaviar.com.br', name: 'Angel Viewer 09', role: 'ANGEL_VIEWER' },
  { email: 'angel10@kaviar.com.br', name: 'Angel Viewer 10', role: 'ANGEL_VIEWER' }
];

async function main() {
  console.log('🔐 Criando 12 admins...');
  console.log(`   - 2 SUPER_ADMIN`);
  console.log(`   - 10 ANGEL_VIEWER`);
  console.log('');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const credentials = [];
  
  for (const admin of admins) {
    const tempPassword = generateStrongPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    
    try {
      const existing = await prisma.admins.findUnique({
        where: { email: admin.email }
      });
      
      if (existing) {
        await prisma.admins.update({
          where: { email: admin.email },
          data: {
            name: admin.name,
            role: admin.role,
            password: passwordHash,
            must_change_password: true,
            is_active: true,
            updated_at: new Date()
          }
        });
        updated++;
        credentials.push({ ...admin, password: tempPassword, status: 'updated' });
      } else {
        await prisma.admins.create({
          data: {
            id: crypto.randomUUID(),
            name: admin.name,
            email: admin.email,
            password: passwordHash,
            role: admin.role,
            must_change_password: true,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        created++;
        credentials.push({ ...admin, password: tempPassword, status: 'created' });
      }
    } catch (e) {
      console.error(`❌ Erro ao processar ${admin.email}:`, e.message);
      skipped++;
    }
  }
  
  console.log('✅ Processamento concluído:');
  console.log(`   - Criados: ${created}`);
  console.log(`   - Atualizados: ${updated}`);
  console.log(`   - Erros: ${skipped}`);
  console.log(`   - Total processado: ${created + updated}`);
  console.log('');
  
  // Validação
  const total = await prisma.admins.count();
  const byRole = await prisma.$queryRaw`
    SELECT role, COUNT(*)::int as count 
    FROM admins 
    GROUP BY role 
    ORDER BY role
  `;
  
  console.log('📊 Validação no banco:');
  console.log(`   Total de admins: ${total}`);
  byRole.forEach(r => console.log(`   ${r.role}: ${r.count}`));
  console.log('');
  
  // Tabela resumida
  console.log('📋 RESUMO DOS ADMINS CRIADOS:');
  console.log('');
  console.log('Email'.padEnd(35) + ' | ' + 'Role'.padEnd(15) + ' | Status');
  console.log('-'.repeat(70));
  credentials.forEach(c => {
    console.log(c.email.padEnd(35) + ' | ' + c.role.padEnd(15) + ' | ' + c.status);
  });
  console.log('');
  
  // Credenciais (ATENÇÃO: Copiar e guardar com segurança!)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 SENHAS TEMPORÁRIAS (COPIAR E GUARDAR COM SEGURANÇA!)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  IMPORTANTE: Todos os admins devem trocar a senha no primeiro login!');
  console.log('');
  credentials.forEach(c => {
    console.log(`${c.email}`);
    console.log(`Senha: ${c.password}`);
    console.log('');
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  });
