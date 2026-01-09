const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Zona Oeste/Barra + Alto da Boa Vista + Grande Tijuca (complemento)
const RJ_ZONE_OESTE_NEIGHBORHOODS = {
  // Zona Oeste/Barra
  'Barra da Tijuca': ['Rio das Pedras', 'Muzema', 'Tijuquinha'],
  'Itanhangá': ['Itanhangá'],
  'Anil': ['Anil'],
  'Jacarepaguá': ['Cidade de Deus', 'Vila Valqueire'],
  
  // Alto da Boa Vista
  'Alto da Boa Vista': ['Mata Machado', 'Furnas', 'Agrícola', 'Tijuaçu'],
  
  // Grande Tijuca (garantir comunidades que faltam)
  'Tijuca': ['Borel', 'Formiga'] // Adicionar às existentes se não estiverem
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

async function seedRJZoneOeste() {
  console.log('🏙️ Criando bairros e comunidades da Zona Oeste/Barra + Alto da Boa Vista...');
  
  const results = {
    neighborhoods: { created: 0, updated: 0, skipped: 0 },
    communities: { created: 0, updated: 0, skipped: 0 },
    errors: []
  };
  
  for (const [neighborhoodName, communities] of Object.entries(RJ_ZONE_OESTE_NEIGHBORHOODS)) {
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
            radiusMeters: 3000 // Zona Oeste tem áreas maiores
          }
        });
        
        console.log(`  ✅ Bairro criado: ${neighborhoodName}`);
        results.neighborhoods.created++;
      } else {
        console.log(`  ℹ️ Bairro já existe: ${neighborhoodName}`);
        results.neighborhoods.skipped++;
      }
      
      // Processar comunidades/favelas do bairro
      for (const communityName of communities) {
        try {
          // Verificar se comunidade já existe (por nome e contexto)
          const existingCommunity = await prisma.community.findFirst({
            where: { 
              name: communityName,
              OR: [
                { description: { contains: neighborhoodName } },
                { description: { contains: communityName } }
              ]
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
                radiusMeters: 800
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
  const reportPath = path.join(__dirname, '..', '..', 'audit', 'rj_zone_oeste_seed_report.md');
  
  let report = '# Relatório de Seed - Zona Oeste/Barra + Alto da Boa Vista\n\n';
  report += `**Data:** ${new Date().toISOString()}\n`;
  report += `**Bairros processados:** ${Object.keys(RJ_ZONE_OESTE_NEIGHBORHOODS).length}\n\n`;
  
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
  Object.entries(RJ_ZONE_OESTE_NEIGHBORHOODS).forEach(([neighborhood, communities]) => {
    report += `### ${neighborhood}\n`;
    communities.forEach(community => {
      report += `- ${community}\n`;
    });
    report += '\n';
  });
  
  report += '## Chaves Canônicas\n\n';
  Object.entries(RJ_ZONE_OESTE_NEIGHBORHOODS).forEach(([neighborhood, communities]) => {
    const neighborhoodKey = generateCanonicalKey(neighborhood);
    report += `### ${neighborhood}\n`;
    report += `- **Bairro:** \`${neighborhoodKey}\`\n`;
    communities.forEach(community => {
      const communityKey = generateCanonicalKey(community, neighborhood);
      report += `- **${community}:** \`${communityKey}\`\n`;
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
    await seedRJZoneOeste();
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

module.exports = { seedRJZoneOeste };
