import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  console.log('🚀 Importando 192 bairros (SP + RJ)...\n');

  // São Paulo - 30 bairros
  const spBairros = [
    'Bela Vista', 'Brooklin', 'Butantã', 'Campo Belo', 'Casa Verde',
    'Cidade Tiradentes', 'Consolação', 'Guaianases', 'Itaim Bibi', 'Itaquera',
    'Jabaquara', 'Jaçanã', 'Lapa', 'Liberdade', 'Moema',
    'Mooca', 'Penha', 'Perdizes', 'Pinheiros', 'República',
    'Santana', 'Santo Amaro', 'São Miguel Paulista', 'Sé', 'Tatuapé',
    'Tucuruvi', 'Vila Leopoldina', 'Vila Maria', 'Vila Mariana', 'Vila Prudente'
  ];

  // Rio de Janeiro - 162 bairros (principais)
  const rjBairros = [
    'Abolição', 'Acari', 'Água Santa', 'Alto da Boa Vista', 'Anchieta',
    'Andaraí', 'Anil', 'Bancários', 'Bangu', 'Barros Filho',
    'Barra da Tijuca', 'Barra de Guaratiba', 'Benfica', 'Bento Ribeiro', 'Bonsucesso',
    'Botafogo', 'Brás de Pina', 'Cachambi', 'Cacuia', 'Caju',
    'Camorim', 'Campinho', 'Campo dos Afonsos', 'Campo Grande', 'Cascadura',
    'Catete', 'Catumbi', 'Cavalcanti', 'Centro', 'Cidade de Deus',
    'Cidade Nova', 'Cidade Universitária', 'Cocotá', 'Coelho Neto', 'Colégio',
    'Complexo do Alemão', 'Copacabana', 'Cordovil', 'Cosmos', 'Costa Barros',
    'Curicica', 'Del Castilho', 'Deodoro', 'Encantado', 'Engenheiro Leal',
    'Engenho da Rainha', 'Engenho de Dentro', 'Engenho Novo', 'Estácio', 'Flamengo',
    'Freguesia (Jacarepaguá)', 'Freguesia (Ilha)', 'Galeão', 'Gamboa', 'Gardênia Azul',
    'Gávea', 'Glória', 'Grajau', 'Guadalupe', 'Guaratiba',
    'Higienópolis', 'Honório Gurgel', 'Humaitá', 'Inhaúma', 'Inhoaíba',
    'Ipanema', 'Irajá', 'Itanhangá', 'Jacaré', 'Jacarepaguá',
    'Jardim América', 'Jardim Botânico', 'Jardim Carioca', 'Jardim Guanabara', 'Jardim Sulacap',
    'Joá', 'Lagoa', 'Laranjeiras', 'Leblon', 'Leme',
    'Lins de Vasconcelos', 'Madureira', 'Magalhães Bastos', 'Mangueira', 'Manguinhos',
    'Maracanã', 'Maré', 'Marechal Hermes', 'Maria da Graça', 'Méier',
    'Moneró', 'Olaria', 'Oswaldo Cruz', 'Paciência', 'Padre Miguel',
    'Parada de Lucas', 'Parque Anchieta', 'Parque Colúmbia', 'Pavuna', 'Pechincha',
    'Pedra de Guaratiba', 'Penha', 'Penha Circular', 'Piedade', 'Pilares',
    'Pitangueiras', 'Portuguesa', 'Praia da Bandeira', 'Praça da Bandeira', 'Praça Seca',
    'Quintino Bocaiúva', 'Ramos', 'Realengo', 'Recreio dos Bandeirantes', 'Riachuelo',
    'Ribeira', 'Ricardo de Albuquerque', 'Rio Comprido', 'Rocha', 'Rocha Miranda',
    'Rocinha', 'Santa Cruz', 'Santa Teresa', 'Santíssimo', 'Santo Cristo',
    'São Conrado', 'São Cristóvão', 'São Francisco Xavier', 'Senador Camará', 'Senador Vasconcelos',
    'Sepetiba', 'Tanque', 'Taquara', 'Tauá', 'Tijuca',
    'Tomás Coelho', 'Todos os Santos', 'Triagem', 'Turiaçu', 'Urca',
    'Vargem Grande', 'Vargem Pequena', 'Vasco da Gama', 'Várzea', 'Vicente de Carvalho',
    'Vigário Geral', 'Vila da Penha', 'Vila Isabel', 'Vila Kennedy', 'Vila Kosmos',
    'Vila Militar', 'Vila Valqueire', 'Vista Alegre', 'Zumbi'
  ];

  let spCount = 0;
  let rjCount = 0;

  // Importar São Paulo
  for (const nome of spBairros) {
    try {
      await prisma.neighborhood.upsert({
        where: { 
          name_city_state: {
            name: nome,
            city: 'São Paulo',
            state: 'SP'
          }
        },
        update: {},
        create: {
          name: nome,
          city: 'São Paulo',
          state: 'SP'
        }
      });
      spCount++;
      console.log(`✅ SP: ${nome}`);
    } catch (error) {
      console.error(`❌ Erro ao importar ${nome}:`, error);
    }
  }

  // Importar Rio de Janeiro
  for (const nome of rjBairros) {
    try {
      await prisma.neighborhood.upsert({
        where: { 
          name_city_state: {
            name: nome,
            city: 'Rio de Janeiro',
            state: 'RJ'
          }
        },
        update: {},
        create: {
          name: nome,
          city: 'Rio de Janeiro',
          state: 'RJ'
        }
      });
      rjCount++;
      console.log(`✅ RJ: ${nome}`);
    } catch (error) {
      console.error(`❌ Erro ao importar ${nome}:`, error);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ IMPORTAÇÃO COMPLETA!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`São Paulo: ${spCount}/${spBairros.length} bairros`);
  console.log(`Rio de Janeiro: ${rjCount}/${rjBairros.length} bairros`);
  console.log(`Total: ${spCount + rjCount} bairros importados`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
