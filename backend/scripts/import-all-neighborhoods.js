const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const neighborhoods = [
  // Rio de Janeiro (162)
  {name:"Abolição",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Acari",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Água Santa",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Alto da Boa Vista",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Anchieta",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Andaraí",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Anil",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Bancários",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Bangu",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Barros Filho",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Barra da Tijuca",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Barra de Guaratiba",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Benfica",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Bento Ribeiro",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Bonsucesso",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Botafogo",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Brás de Pina",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Cachambi",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Cacuia",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Caju",city:"Rio de Janeiro",zone:"Zona Portuária"},{name:"Camorim",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Campinho",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Campo dos Afonsos",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Campo Grande",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Cascadura",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Catete",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Catumbi",city:"Rio de Janeiro",zone:"Centro"},{name:"Cavalcanti",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Centro",city:"Rio de Janeiro",zone:"Centro"},{name:"Cidade de Deus",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Cidade Nova",city:"Rio de Janeiro",zone:"Centro"},{name:"Cidade Universitária",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Cocotá",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Coelho Neto",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Colégio",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Complexo do Alemão",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Copacabana",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Cordovil",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Cosmos",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Costa Barros",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Curicica",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Deodoro",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Encantado",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Engenheiro Leal",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Engenho da Rainha",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Engenho de Dentro",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Engenho Novo",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Estácio",city:"Rio de Janeiro",zone:"Centro"},{name:"Flamengo",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Freguesia (Jacarepaguá)",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Freguesia (Ilha do Governador)",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Galeão",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Gamboa",city:"Rio de Janeiro",zone:"Zona Portuária"},{name:"Gardênia Azul",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Gávea",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Glória",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Grajau",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Grumari",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Guadalupe",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Guaratiba",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Higienópolis",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Honório Gurgel",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Humaitá",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Inhaúma",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Inhoaíba",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Ipanema",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Irajá",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Itanhangá",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Jacaré",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Jacarepaguá",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Jacarezinho",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Jardim América",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Jardim Botânico",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Jardim Carioca",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Jardim Guanabara",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Jardim Sulacap",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Joá",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Lagoa",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Lapa",city:"Rio de Janeiro",zone:"Centro"},{name:"Laranjeiras",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Leblon",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Leme",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Lins de Vasconcelos",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Madureira",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Magalhães Bastos",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Mangueira",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Manguinhos",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Maracanã",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Maré",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Marechal Hermes",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Maria da Graça",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Méier",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Moneró",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Olaria",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Oswaldo Cruz",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Paciência",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Padre Miguel",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Parada de Lucas",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Parque Anchieta",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Parque Columbia",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Pavuna",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Pechincha",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Pedra de Guaratiba",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Penha",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Penha Circular",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Piedade",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Pilares",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Pitangueiras",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Portuguesa",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Praia da Bandeira",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Praça da Bandeira",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Praça Seca",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Quintino Bocaiúva",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Ramos",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Realengo",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Recreio dos Bandeirantes",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Riachuelo",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Ribeira",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Ricardo de Albuquerque",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Rio Comprido",city:"Rio de Janeiro",zone:"Centro"},{name:"Rocha",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Rocha Miranda",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Rocinha",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Sampaio",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Santa Cruz",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Santa Teresa",city:"Rio de Janeiro",zone:"Centro"},{name:"Santíssimo",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Santo Cristo",city:"Rio de Janeiro",zone:"Zona Portuária"},{name:"São Conrado",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"São Cristóvão",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"São Francisco Xavier",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Saúde",city:"Rio de Janeiro",zone:"Zona Portuária"},{name:"Senador Camará",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Senador Vasconcelos",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Sepetiba",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Tanque",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Taquara",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Tauá",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Tijuca",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Tomás Coelho",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Todos os Santos",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Turiaçu",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Urca",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Vargem Grande",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Vargem Pequena",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Vasco da Gama",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Várzea",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Vicente de Carvalho",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vigário Geral",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vila da Penha",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vila Isabel",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vila Kosmos",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vila Militar",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Vila Valqueire",city:"Rio de Janeiro",zone:"Zona Oeste"},{name:"Vista Alegre",city:"Rio de Janeiro",zone:"Zona Norte"},{name:"Vidigal",city:"Rio de Janeiro",zone:"Zona Sul"},{name:"Zumbi",city:"Rio de Janeiro",zone:"Zona Norte"},
  // São Paulo (30)
  {name:"Aclimação",city:"São Paulo",zone:"Centro-Sul"},{name:"Água Branca",city:"São Paulo",zone:"Oeste"},{name:"Alto de Pinheiros",city:"São Paulo",zone:"Oeste"},{name:"Barra Funda",city:"São Paulo",zone:"Oeste"},{name:"Bela Vista",city:"São Paulo",zone:"Centro"},{name:"Brooklin",city:"São Paulo",zone:"Sul"},{name:"Butantã",city:"São Paulo",zone:"Oeste"},{name:"Campo Belo",city:"São Paulo",zone:"Sul"},{name:"Cerqueira César",city:"São Paulo",zone:"Centro-Sul"},{name:"Consolação",city:"São Paulo",zone:"Centro"},{name:"Higienópolis",city:"São Paulo",zone:"Centro"},{name:"Ipiranga",city:"São Paulo",zone:"Sul"},{name:"Itaim Bibi",city:"São Paulo",zone:"Sul"},{name:"Jabaquara",city:"São Paulo",zone:"Sul"},{name:"Jardim América",city:"São Paulo",zone:"Oeste"},{name:"Jardim Europa",city:"São Paulo",zone:"Oeste"},{name:"Jardim Paulista",city:"São Paulo",zone:"Oeste"},{name:"Lapa",city:"São Paulo",zone:"Oeste"},{name:"Liberdade",city:"São Paulo",zone:"Centro"},{name:"Moema",city:"São Paulo",zone:"Sul"},{name:"Mooca",city:"São Paulo",zone:"Leste"},{name:"Morumbi",city:"São Paulo",zone:"Sul"},{name:"Paraíso",city:"São Paulo",zone:"Centro-Sul"},{name:"Perdizes",city:"São Paulo",zone:"Oeste"},{name:"Pinheiros",city:"São Paulo",zone:"Oeste"},{name:"República",city:"São Paulo",zone:"Centro"},{name:"Santa Cecília",city:"São Paulo",zone:"Centro"},{name:"Santana",city:"São Paulo",zone:"Norte"},{name:"Tatuapé",city:"São Paulo",zone:"Leste"},{name:"Vila Mariana",city:"São Paulo",zone:"Sul"}
];

async function main() {
  const expectedCount = neighborhoods.length;
  console.log(`🚀 Importando ${expectedCount} bairros...`);
  console.log(`   - Rio de Janeiro: 157`);
  console.log(`   - São Paulo: 30`);
  console.log('');
  
  let imported = 0;
  let skipped = 0;
  const skippedList = [];
  
  for (const n of neighborhoods) {
    try {
      await prisma.neighborhoods.create({
        data: {
          id: require('crypto').randomUUID(),
          name: n.name,
          city: n.city,
          zone: n.zone,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      imported++;
    } catch (e) {
      if (e.code === 'P2002') {
        skipped++;
        if (skippedList.length < 20) {
          skippedList.push(`${n.name} (${n.city})`);
        }
      } else {
        throw e;
      }
    }
  }
  
  console.log(`✅ Importação concluída:`);
  console.log(`   - Esperado: ${expectedCount}`);
  console.log(`   - Novos: ${imported}`);
  console.log(`   - Já existentes (skipped): ${skipped}`);
  console.log(`   - Total processado: ${imported + skipped}`);
  
  if (skippedList.length > 0) {
    console.log('');
    console.log(`⚠️  Bairros já existentes (primeiros ${skippedList.length}):`);
    skippedList.forEach(name => console.log(`   - ${name}`));
  }
  
  const result = await prisma.$queryRaw`
    SELECT city, COUNT(*)::int as total 
    FROM neighborhoods 
    GROUP BY city 
    ORDER BY city
  `;
  
  console.log('\n📊 Bairros por cidade (banco):');
  console.log(JSON.stringify(result, null, 2));
  
  const totalInDb = result.reduce((sum, r) => sum + r.total, 0);
  console.log(`\n📈 Total no banco: ${totalInDb}`);
  
  if (totalInDb !== expectedCount) {
    console.log(`\n⚠️  ATENÇÃO: Diferença de ${Math.abs(totalInDb - expectedCount)} bairros`);
    console.log(`   Esperado: ${expectedCount} | No banco: ${totalInDb}`);
  } else {
    console.log(`\n✅ Contagem OK: ${totalInDb} bairros`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  });
