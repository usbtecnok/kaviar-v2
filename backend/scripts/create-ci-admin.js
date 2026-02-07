/**
 * Criar service account admin para CI/CD
 * Gera token JWT de longa duração para smoke tests
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createCIAdmin() {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado');
  }

  const email = 'ci-admin@kaviar.internal';
  const password = randomUUID(); // Senha aleatória (não será usada)
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Criar ou atualizar admin CI
    const admin = await prisma.admins.upsert({
      where: { email },
      update: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
      create: {
        id: randomUUID(),
        email,
        password_hash: passwordHash,
        name: 'CI/CD Service Account',
        role: 'OPERATOR', // Não SUPER_ADMIN por segurança
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Gerar token de longa duração (90 dias)
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'ci-service-account',
      },
      JWT_SECRET,
      { expiresIn: '90d' }
    );

    console.log('✅ CI Admin criado com sucesso!');
    console.log('');
    console.log('📋 Configuração:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Expira em: 90 dias`);
    console.log('');
    console.log('🔑 Token (adicionar no GitHub Secrets como CI_ADMIN_TOKEN):');
    console.log('');
    console.log(token);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Não commitar este token no Git');
    console.log('   - Rotacionar a cada 90 dias');
    console.log('   - Usar apenas em CI/CD (não em produção)');

  } catch (error) {
    console.error('❌ Erro ao criar CI admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createCIAdmin();
