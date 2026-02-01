#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const neighborhoods = [
  // São Paulo (30)
  {"name":"Aclimação","city":"São Paulo","state":"SP","zone":"Centro-Sul"},
  {"name":"Água Branca","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Alto de Pinheiros","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Barra Funda","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Bela Vista","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Brooklin","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Butantã","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Campo Belo","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Cerqueira César","city":"São Paulo","state":"SP","zone":"Centro-Sul"},
  {"name":"Consolação","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Higienópolis","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Ipiranga","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Itaim Bibi","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Jabaquara","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Jardim América","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Jardim Europa","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Jardim Paulista","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Lapa","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Liberdade","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Moema","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Mooca","city":"São Paulo","state":"SP","zone":"Leste"},
  {"name":"Morumbi","city":"São Paulo","state":"SP","zone":"Sul"},
  {"name":"Paraíso","city":"São Paulo","state":"SP","zone":"Centro-Sul"},
  {"name":"Perdizes","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"Pinheiros","city":"São Paulo","state":"SP","zone":"Oeste"},
  {"name":"República","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Santa Cecília","city":"São Paulo","state":"SP","zone":"Centro"},
  {"name":"Santana","city":"São Paulo","state":"SP","zone":"Norte"},
  {"name":"Tatuapé","city":"São Paulo","state":"SP","zone":"Leste"},
  {"name":"Vila Mariana","city":"São Paulo","state":"SP","zone":"Sul"}
];

async function main() {
  console.log('🚀 Iniciando importação de bairros...');
  
  let imported = 0;
  let updated = 0;
  
  for (const n of neighborhoods) {
    const result = await prisma.neighborhood.upsert({
      where: {
        name_city: {
          name: n.name,
          city: n.city
        }
      },
      update: n,
      create: n
    });
    
    if (result.createdAt === result.updatedAt) {
      imported++;
    } else {
      updated++;
    }
  }
  
  console.log(`✅ Importação concluída:`);
  console.log(`   - Novos: ${imported}`);
  console.log(`   - Atualizados: ${updated}`);
  console.log(`   - Total: ${neighborhoods.length}`);
  
  const total = await prisma.neighborhood.count();
  console.log(`📊 Total de bairros no banco: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  });
