#!/bin/bash
set -e

echo "🧪 Teste Local: São Paulo + Líderes Comunitários"
echo "================================================"
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não configurada"
  exit 1
fi

cd backend

echo "1️⃣ Testando Migration..."
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'neighborhoods' AND column_name = 'city';" | grep -q "city" && echo "✅ Coluna city existe" || echo "❌ Coluna city não existe"

psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'community_leaders';" | grep -q "community_leaders" && echo "✅ Tabela community_leaders existe" || echo "❌ Tabela community_leaders não existe"

echo ""
echo "2️⃣ Testando Dados..."
echo "Bairros por cidade:"
psql "$DATABASE_URL" -c "SELECT city, COUNT(*) FROM neighborhoods GROUP BY city;"

echo ""
echo "3️⃣ Testando API de Líderes..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Test create
    const leader = await prisma.community_leaders.create({
      data: {
        name: 'Teste Leader',
        email: 'teste@example.com',
        leader_type: 'PRESIDENTE_ASSOCIACAO',
        verification_status: 'PENDING'
      }
    });
    console.log('✅ Create leader:', leader.id);

    // Test read
    const leaders = await prisma.community_leaders.findMany();
    console.log('✅ Read leaders:', leaders.length);

    // Test update
    await prisma.community_leaders.update({
      where: { id: leader.id },
      data: { verification_status: 'VERIFIED' }
    });
    console.log('✅ Update leader');

    // Test delete
    await prisma.community_leaders.delete({
      where: { id: leader.id }
    });
    console.log('✅ Delete leader');

    console.log('');
    console.log('✅ Todos os testes passaram!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

test();
"

echo ""
echo "4️⃣ Testando Neighborhoods com City..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const sp = await prisma.neighborhoods.findMany({
      where: { city: 'São Paulo' },
      take: 3
    });
    console.log('✅ Bairros de SP:', sp.map(n => n.name).join(', '));

    const rj = await prisma.neighborhoods.findMany({
      where: { city: 'Rio de Janeiro' },
      take: 3
    });
    console.log('✅ Bairros do RJ:', rj.map(n => n.name).join(', '));
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

test();
"

echo ""
echo "✅ Testes locais concluídos com sucesso!"
echo ""
echo "Pronto para deploy? Execute:"
echo "  ./deploy-sao-paulo-leaders.sh"
