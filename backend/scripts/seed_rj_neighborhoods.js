const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Bairros RJ com suas comunidades/favelas associadas
const RJ_NEIGHBORHOODS = {
  // Centro/AP1
  'Centro': ['Morro da Providência', 'Morro do Livramento', 'Morro da Conceição'],
  'Lapa': ['Morro de Santa Teresa', 'Morro do Pinto'],
  'Glória': ['Morro da Glória', 'Morro do Russel'],
  'Catumbi': ['Morro do Catumbi', 'Morro de São Carlos'],
  'Cidade Nova': ['Morro do Turano'],
  'Estácio': ['Morro do Estácio', 'Morro de São Carlos'],
  'Santa Teresa': ['Morro dos Prazeres', 'Morro do Escondidinho'],
  'Saúde': ['Morro da Saúde', 'Morro do Livramento'],
  'Gamboa': ['Morro da Gamboa'],
  'Santo Cristo': ['Morro do Santo Cristo'],
  'Rio Comprido': ['Morro do Turano', 'Morro do Fallet'],
  'São Cristóvão': ['Morro do São Cristóvão'],

  // Zona Sul
  'Flamengo': ['Morro da Viúva'],
  'Catete': ['Morro do Catete'],
  'Botafogo': ['Morro da Urca', 'Morro do Pasmado'],
  'Urca': ['Morro da Urca'],
  'Leme': ['Morro do Leme'],
  'Ipanema': ['Morro do Cantagalo', 'Pavão-Pavãozinho'],
  'Leblon': ['Cruzada São Sebastião', 'Vidigal'],
  'Lagoa': ['Parque da Cidade'],
  'Jardim Botânico': ['Horto'],
  'Gávea': ['Rocinha', 'Cruzada São Sebastião'],
  'Humaitá': ['Morro da Babilônia', 'Chapéu Mangueira'],
  'Laranjeiras': ['Morro de Santa Marta'],
  'Cosme Velho': ['Morro do Cosme Velho'],

  // Grande Tijuca
  'Tijuca': ['Morro do Borel', 'Morro da Formiga', 'Salgueiro'],
  'Maracanã': ['Morro do Maracanã'],
  'Vila Isabel': ['Morro dos Macacos'],
  'Grajaú': ['Morro do Grajaú'],
  'Andaraí': ['Morro do Andaraí'],
  'Praça da Bandeira': ['Morro da Mineira']
};

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

function generateCanonicalKey(name, parent = null) {
  const normalizedName = normalizeName(name);
  const city = 'rio de janeiro';
  const state = 'rj';
  
  if (parent) {
    const normalizedParent = normalizeName(parent);
    return `${normalizedName}|${normalizedParent}|${city}|${state}`;
  }
  
  return `${normalizedName}|${city}|${state}`;
}

async function seedRJNeighborhoods() {
  console.log('🏙️ Criando bairros e comunidades do Rio de Janeiro...');
  
  const results = {
    neighborhoods: { created: 0, updated: 0, skipped: 0 },
    communities: { created: 0, updated: 0, skipped: 0 },
    errors: []
  };
  
  for (const [neighborhoodName, communities] of Object.entries(RJ_NEIGHBORHOODS)) {
    try {
      console.log(`\n📍 Processando bairro: ${neighborhoodName}`);
      
      // Verificar se bairro já existe
      let neighborhood = await prisma.community.findFirst({
        where: { 
          name: neighborhoodName,
          description: { contains: 'Rio de Janeiro' }
        }
      });
      
      if (!neighborhood) {
        // Criar bairro
        neighborhood = await prisma.community.create({
          data: {
            name: neighborhoodName,
            description: `${neighborhoodName} - Rio de Janeiro`,
            isActive: true,
            minActiveDrivers: 3,
            centerLat: null, // Será preenchido pelo geofence
            centerLng: null,
            radiusMeters: 2000
          }
        });
        
        console.log(`  ✅ Bairro criado: ${neighborhoodName}`);
        results.neighborhoods.created++;
      } else {
        console.log(`  ℹ️ Bairro já existe: ${neighborhoodName}`);
        results.neighborhoods.skipped++;
      }
      
      // Criar comunidades/favelas do bairro
      for (const communityName of communities) {
        try {
          const existingCommunity = await prisma.community.findFirst({
            where: { 
              name: communityName,
              description: { contains: neighborhoodName }
            }
          });
          
          if (!existingCommunity) {
            await prisma.community.create({
              data: {
                name: communityName,
                description: `${communityName} - ${neighborhoodName} - Rio de Janeiro`,
                isActive: true,
                minActiveDrivers: 2,
                centerLat: null,
                centerLng: null,
                radiusMeters: 500
              }
            });
            
            console.log(`    ✅ Comunidade criada: ${communityName}`);
            results.communities.created++;
          } else {
            console.log(`    ℹ️ Comunidade já existe: ${communityName}`);
            results.communities.skipped++;
          }
        } catch (error) {
          console.error(`    ❌ Erro ao criar comunidade ${communityName}: ${error.message}`);
          results.errors.push(`Comunidade ${communityName}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar bairro ${neighborhoodName}: ${error.message}`);
      results.errors.push(`Bairro ${neighborhoodName}: ${error.message}`);
    }
  }
  
  // Gerar relatório
  const reportPath = path.join(__dirname, '..', '..', 'audit', 'rj_seed_report.md');
  
  let report = '# Relatório de Seed - Rio de Janeiro\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Bairros processados:** ${Object.keys(RJ_NEIGHBORHOODS).length}\n\n`;
  
  report += '## Resultados\n\n';
  report += '### Bairros\n';
  report += `- **Criados:** ${results.neighborhoods.created}\n`;
  report += `- **Já existiam:** ${results.neighborhoods.skipped}\n`;
  report += `- **Total:** ${results.neighborhoods.created + results.neighborhoods.skipped}\n\n`;
  
  report += '### Comunidades/Favelas\n';
  report += `- **Criadas:** ${results.communities.created}\n`;
  report += `- **Já existiam:** ${results.communities.skipped}\n`;
  report += `- **Total:** ${results.communities.created + results.communities.skipped}\n\n`;
  
  if (results.errors.length > 0) {
    report += '### Erros\n\n';
    results.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += '\n';
  }
  
  report += '## Estrutura Criada\n\n';
  Object.entries(RJ_NEIGHBORHOODS).forEach(([neighborhood, communities]) => {
    report += `### ${neighborhood}\n`;
    communities.forEach(community => {
      report += `- ${community}\n`;
    });
    report += '\n';
  });
  
  fs.writeFileSync(reportPath, report);
  
  console.log('\n📊 Resumo:');
  console.log(`✅ Bairros criados: ${results.neighborhoods.created}`);
  console.log(`✅ Comunidades criadas: ${results.communities.created}`);
  console.log(`⚠️ Erros: ${results.errors.length}`);
  console.log(`📋 Relatório: ${reportPath}`);
  
  return results;
}

async function main() {
  try {
    await seedRJNeighborhoods();
  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { seedRJNeighborhoods };
