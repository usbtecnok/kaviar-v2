// Script para criar 10 contas de investidor com senhas aleatórias
// Uso: node scripts/create-investor-accounts.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Gerar senha aleatória segura
function generateSecurePassword() {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

async function createInvestorAccounts() {
  console.log('🔐 Criando 10 contas de investidor...\n');

  const accounts = [];

  for (let i = 1; i <= 10; i++) {
    const email = `investor${String(i).padStart(2, '0')}@kaviar.com`;
    const password = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Verificar se já existe
      const existing = await prisma.admins.findUnique({
        where: { email }
      });

      if (existing) {
        console.log(`⚠️  ${email} já existe, pulando...`);
        continue;
      }

      // Criar conta
      const admin = await prisma.admins.create({
        data: {
          name: `Investidor ${i}`,
          email,
          password: hashedPassword,
          role: 'INVESTOR_VIEW',
          is_active: true,
          must_change_password: true, // Forçar troca no primeiro acesso
        }
      });

      accounts.push({
        id: admin.id,
        email,
        password, // Senha em texto plano (só para salvar no arquivo)
        role: 'INVESTOR_VIEW',
      });

      console.log(`✅ Criado: ${email}`);
    } catch (error) {
      console.error(`❌ Erro ao criar ${email}:`, error.message);
    }
  }

  console.log(`\n✅ ${accounts.length} contas criadas com sucesso!\n`);

  // Salvar credenciais em arquivo (NÃO VERSIONAR)
  const fs = require('fs');
  const path = require('path');
  
  const outputPath = path.join(__dirname, '../../INVESTORS_ACCESS_GENERATED.md');
  
  let content = '# Credenciais Investidores - GERADAS AUTOMATICAMENTE\n';
  content += '**CONFIDENCIAL - NÃO COMPARTILHAR PUBLICAMENTE**\n\n';
  content += '| # | Email | Senha | Role |\n';
  content += '|---|-------|-------|------|\n';
  
  accounts.forEach((acc, index) => {
    content += `| ${index + 1} | ${acc.email} | ${acc.password} | ${acc.role} |\n`;
  });
  
  content += '\n⚠️ **IMPORTANTE:**\n';
  content += '- Trocar senhas antes de distribuir\n';
  content += '- Definir data de expiração (30 dias)\n';
  content += '- Não versionar este arquivo (adicionar ao .gitignore)\n';
  content += '- Usuários devem trocar senha no primeiro acesso\n';

  fs.writeFileSync(outputPath, content);
  console.log(`📄 Credenciais salvas em: ${outputPath}\n`);
  console.log('⚠️  LEMBRE-SE: Adicionar INVESTORS_ACCESS_GENERATED.md ao .gitignore!\n');

  await prisma.$disconnect();
}

createInvestorAccounts()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
