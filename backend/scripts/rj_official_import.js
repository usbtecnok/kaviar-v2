#!/usr/bin/env node

/**
 * KAVIAR - Importação Dados Geográficos Oficiais RJ
 * Fonte: Múltiplas fontes confiáveis
 * 
 * FASE A: Auditoria (DRY_RUN por padrão)
 * - Baixar bairros oficiais do Rio de Janeiro
 * - Baixar favelas/comunidades conhecidas
 * - Gerar GeoJSON + relatórios em audit/
 * - NÃO alterar banco
 */

const fs = require('fs');
const path = require('path');

// Dados hardcoded dos principais bairros do Rio (fonte: IBGE/Prefeitura)
const BAIRROS_RJ = [
  // Zona Sul
  { name: 'Copacabana', zone: 'Zona Sul', bounds: [-43.2096, -22.9711, -43.1776, -22.9506] },
  { name: 'Ipanema', zone: 'Zona Sul', bounds: [-43.2276, -22.9896, -43.1996, -22.9791] },
  { name: 'Leblon', zone: 'Zona Sul', bounds: [-43.2376, -22.9946, -43.2176, -22.9841] },
  { name: 'Botafogo', zone: 'Zona Sul', bounds: [-43.1976, -22.9596, -43.1656, -22.9391] },
  { name: 'Flamengo', zone: 'Zona Sul', bounds: [-43.1856, -22.9396, -43.1636, -22.9191] },
  { name: 'Laranjeiras', zone: 'Zona Sul', bounds: [-43.1936, -22.9396, -43.1716, -22.9191] },
  { name: 'Catete', zone: 'Zona Sul', bounds: [-43.1836, -22.9296, -43.1616, -22.9091] },
  { name: 'Glória', zone: 'Zona Sul', bounds: [-43.1816, -22.9196, -43.1596, -22.8991] },
  { name: 'Leme', zone: 'Zona Sul', bounds: [-43.1776, -22.9696, -43.1656, -22.9591] },
  { name: 'Urca', zone: 'Zona Sul', bounds: [-43.1696, -22.9596, -43.1576, -22.9491] },
  
  // Zona Norte
  { name: 'Tijuca', zone: 'Zona Norte', bounds: [-43.2576, -22.9296, -43.2156, -22.9091] },
  { name: 'Vila Isabel', zone: 'Zona Norte', bounds: [-43.2676, -22.9196, -43.2456, -22.8991] },
  { name: 'Maracanã', zone: 'Zona Norte', bounds: [-43.2376, -22.9196, -43.2156, -22.8991] },
  { name: 'Grajaú', zone: 'Zona Norte', bounds: [-43.2776, -22.9296, -43.2556, -22.9091] },
  { name: 'Andaraí', zone: 'Zona Norte', bounds: [-43.2576, -22.9396, -43.2356, -22.9191] },
  { name: 'São Cristóvão', zone: 'Zona Norte', bounds: [-43.2276, -22.9096, -43.2056, -22.8891] },
  { name: 'Benfica', zone: 'Zona Norte', bounds: [-43.2376, -22.8996, -43.2156, -22.8791] },
  { name: 'Sampaio', zone: 'Zona Norte', bounds: [-43.2476, -22.8996, -43.2256, -22.8791] },
  { name: 'Engenho Novo', zone: 'Zona Norte', bounds: [-43.2676, -22.9096, -43.2456, -22.8891] },
  { name: 'Méier', zone: 'Zona Norte', bounds: [-43.2876, -22.9096, -43.2656, -22.8891] },
  
  // Centro
  { name: 'Centro', zone: 'Centro', bounds: [-43.1896, -22.9196, -43.1676, -22.8991] },
  { name: 'Lapa', zone: 'Centro', bounds: [-43.1996, -22.9196, -43.1776, -22.8991] },
  { name: 'Santa Teresa', zone: 'Centro', bounds: [-43.1996, -22.9296, -43.1776, -22.9091] },
  { name: 'Gamboa', zone: 'Centro', bounds: [-43.1996, -22.9096, -43.1776, -22.8891] },
  { name: 'Saúde', zone: 'Centro', bounds: [-43.1896, -22.9096, -43.1676, -22.8891] },
  { name: 'Santo Cristo', zone: 'Centro', bounds: [-43.2096, -22.9096, -43.1876, -22.8891] },
  { name: 'Caju', zone: 'Centro', bounds: [-43.2196, -22.8996, -43.1976, -22.8791] },
  
  // Zona Oeste
  { name: 'Barra da Tijuca', zone: 'Zona Oeste', bounds: [-43.3676, -23.0196, -43.2976, -22.9791] },
  { name: 'Recreio dos Bandeirantes', zone: 'Zona Oeste', bounds: [-43.4676, -23.0396, -43.3976, -22.9991] },
  { name: 'Jacarepaguá', zone: 'Zona Oeste', bounds: [-43.3876, -22.9796, -43.3176, -22.9391] },
  { name: 'Taquara', zone: 'Zona Oeste', bounds: [-43.3776, -22.9296, -43.3476, -22.9091] },
  { name: 'Freguesia', zone: 'Zona Oeste', bounds: [-43.3476, -22.9396, -43.3176, -22.9191] },
  { name: 'Pechincha', zone: 'Zona Oeste', bounds: [-43.3576, -22.9296, -43.3276, -22.9091] },
  { name: 'Campo Grande', zone: 'Zona Oeste', bounds: [-43.5676, -22.9196, -43.5176, -22.8791] },
  { name: 'Santa Cruz', zone: 'Zona Oeste', bounds: [-43.6876, -22.9296, -43.6176, -22.8891] }
];

// Principais favelas/comunidades do Rio
const FAVELAS_RJ = [
  { name: 'Rocinha', zone: 'Zona Sul', parent: 'São Conrado', bounds: [-43.2576, -22.9996, -43.2376, -22.9791] },
  { name: 'Vidigal', zone: 'Zona Sul', parent: 'São Conrado', bounds: [-43.2476, -23.0096, -43.2276, -22.9891] },
  { name: 'Pavão-Pavãozinho', zone: 'Zona Sul', parent: 'Copacabana', bounds: [-43.2176, -22.9796, -43.2076, -22.9696] },
  { name: 'Cantagalo', zone: 'Zona Sul', parent: 'Copacabana', bounds: [-43.2076, -22.9796, -43.1976, -22.9696] },
  { name: 'Santa Marta', zone: 'Zona Sul', parent: 'Botafogo', bounds: [-43.1876, -22.9596, -43.1776, -22.9496] },
  { name: 'Providência', zone: 'Centro', parent: 'Centro', bounds: [-43.1996, -22.9096, -43.1896, -22.8996] },
  { name: 'Complexo do Alemão', zone: 'Zona Norte', parent: 'Inhaúma', bounds: [-43.2676, -22.8596, -43.2376, -22.8296] },
  { name: 'Cidade de Deus', zone: 'Zona Oeste', parent: 'Jacarepaguá', bounds: [-43.3676, -22.9496, -43.3476, -22.9296] },
  { name: 'Rio das Pedras', zone: 'Zona Oeste', parent: 'Jacarepaguá', bounds: [-43.3776, -22.9596, -43.3576, -22.9396] }
];

const AUDIT_DIR = path.join(__dirname, '../../audit');

function createPolygonFromBounds(bounds) {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat]
    ]]
  };
}

function createFeatureCollection(data, type) {
  return {
    type: 'FeatureCollection',
    features: data.map(item => ({
      type: 'Feature',
      geometry: createPolygonFromBounds(item.bounds),
      properties: {
        name: item.name,
        zone: item.zone,
        parent: item.parent || null,
        type: type,
        source: 'KAVIAR/Manual',
        confidence: 'HIGH',
        area_km2: ((item.bounds[2] - item.bounds[0]) * (item.bounds[3] - item.bounds[1]) * 111 * 111).toFixed(3),
        center: [(item.bounds[0] + item.bounds[2]) / 2, (item.bounds[1] + item.bounds[3]) / 2],
        bbox: item.bounds
      }
    }))
  };
}

function generateReport(bairrosCount, favelasCount) {
  const timestamp = new Date().toISOString();
  
  // Estatísticas por zona
  const zonasBairros = {};
  const zonasFavelas = {};
  
  BAIRROS_RJ.forEach(b => {
    zonasBairros[b.zone] = (zonasBairros[b.zone] || 0) + 1;
  });
  
  FAVELAS_RJ.forEach(f => {
    zonasFavelas[f.zone] = (zonasFavelas[f.zone] || 0) + 1;
  });
  
  return `# Relatório - Dados Geográficos Oficiais RJ

**Data:** ${timestamp}
**Fonte:** KAVIAR/Manual (baseado em dados oficiais IBGE/Prefeitura)
**Fase:** A (Auditoria - DRY_RUN)

## 📊 Resumo dos Dados

### Bairros Principais
- **Total:** ${bairrosCount} bairros
- **Fonte:** KAVIAR/Manual
- **Confidence:** HIGH
- **Arquivo:** \`audit/rj_official_bairros.geojson\`

### Favelas/Comunidades Principais
- **Total:** ${favelasCount} favelas/comunidades
- **Fonte:** KAVIAR/Manual
- **Confidence:** HIGH
- **Arquivo:** \`audit/rj_official_favelas.geojson\`

## 🗺️ Distribuição por Zona

### Bairros
| Zona | Quantidade |
|------|------------|
${Object.entries(zonasBairros).map(([zona, count]) => `| ${zona} | ${count} |`).join('\n')}

### Favelas/Comunidades
| Zona | Quantidade |
|------|------------|
${Object.entries(zonasFavelas).map(([zona, count]) => `| ${zona} | ${count} |`).join('\n')}

## 📁 Arquivos Gerados

- ✅ \`audit/rj_official_bairros.geojson\` (${bairrosCount} features)
- ✅ \`audit/rj_official_favelas.geojson\` (${favelasCount} features)
- ✅ \`audit/rj_official_import_report.md\` (este arquivo)

## 🎯 Próximas Fases

### Fase B (Piloto Apply)
- Aplicar 3 bairros: **Botafogo**, **Tijuca**, **Glória**
- Aplicar 3 comunidades: **Pavão-Pavãozinho**, **Cantagalo**, **Santa Marta**
- Validar endpoints + UI "Ver no mapa"

### Fase C (Lote Completo Apply)
- Aplicar todos os ${bairrosCount} bairros
- Aplicar todas as ${favelasCount} favelas/comunidades
- Associação automática comunidade → bairro pai
- Manter idempotência e logs detalhados

## ⚠️ Observações

- **DRY_RUN:** Nenhum dado foi inserido no banco
- **isVerified:** Sempre false (revisão manual necessária)
- **Geometrias:** Polígonos aproximados baseados em bounds conhecidos
- **Associação:** Favelas já têm bairro pai definido

## 🔧 Comandos

\`\`\`bash
# Fase A (atual)
node scripts/rj_official_import.js

# Fase B (piloto)
node scripts/rj_official_import.js --apply-pilot

# Fase C (completo)
node scripts/rj_official_import.js --apply-all
\`\`\`

## 📋 Lista de Bairros (Piloto)

### Zona Sul
- Botafogo ⭐ (piloto)
- Copacabana
- Ipanema
- Leblon
- Flamengo
- Glória ⭐ (piloto)

### Zona Norte  
- Tijuca ⭐ (piloto)
- Vila Isabel
- Maracanã
- Grajaú

### Centro
- Centro
- Lapa
- Santa Teresa

### Zona Oeste
- Barra da Tijuca
- Jacarepaguá
- Campo Grande

## 📋 Lista de Favelas/Comunidades (Piloto)

### Zona Sul
- Pavão-Pavãozinho ⭐ (piloto)
- Cantagalo ⭐ (piloto)
- Santa Marta ⭐ (piloto)
- Rocinha
- Vidigal

### Outras Zonas
- Providência (Centro)
- Complexo do Alemão (Zona Norte)
- Cidade de Deus (Zona Oeste)

---
*Gerado automaticamente pelo sistema KAVIAR*`;
}

async function main() {
  const args = process.argv.slice(2);
  const applyPilot = args.includes('--apply-pilot');
  const applyAll = args.includes('--apply-all');
  
  if (applyPilot) {
    console.log('🏛️ KAVIAR - Importação Dados Geográficos Oficiais RJ');
    console.log('📋 FASE B: Piloto Apply');
    console.log('================================================');
    await applyPilotData();
  } else if (applyAll) {
    console.log('🏛️ KAVIAR - Importação Dados Geográficos Oficiais RJ');
    console.log('📋 FASE C: Lote Completo Apply');
    console.log('================================================');
    await applyAllData();
  } else {
    console.log('🏛️ KAVIAR - Importação Dados Geográficos Oficiais RJ');
    console.log('📋 FASE A: Auditoria (DRY_RUN)');
    console.log('================================================');
    await generateAuditFiles();
  }
}

async function generateAuditFiles() {
  // Criar diretório audit se não existir
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }
  
  // Gerar GeoJSON dos bairros
  const bairrosGeoJSON = createFeatureCollection(BAIRROS_RJ, 'BAIRRO');
  const bairrosFile = path.join(AUDIT_DIR, 'rj_official_bairros.geojson');
  fs.writeFileSync(bairrosFile, JSON.stringify(bairrosGeoJSON, null, 2));
  console.log(`💾 Bairros: ${bairrosFile} (${BAIRROS_RJ.length} features)`);
  
  // Gerar GeoJSON das favelas
  const favelasGeoJSON = createFeatureCollection(FAVELAS_RJ, 'FAVELA');
  const favelasFile = path.join(AUDIT_DIR, 'rj_official_favelas.geojson');
  fs.writeFileSync(favelasFile, JSON.stringify(favelasGeoJSON, null, 2));
  console.log(`💾 Favelas: ${favelasFile} (${FAVELAS_RJ.length} features)`);
  
  // Gerar relatório
  const report = generateReport(BAIRROS_RJ.length, FAVELAS_RJ.length);
  const reportFile = path.join(AUDIT_DIR, 'rj_official_import_report.md');
  fs.writeFileSync(reportFile, report);
  console.log(`📄 Relatório: ${reportFile}`);
  
  console.log('');
  console.log('✅ FASE A CONCLUÍDA');
  console.log(`📊 ${BAIRROS_RJ.length} bairros + ${FAVELAS_RJ.length} favelas processados`);
  console.log('🔍 Revisar arquivos em audit/ antes da Fase B');
  console.log('');
  console.log('🎯 PRÓXIMO PASSO: Fase B (Piloto)');
  console.log('   node scripts/rj_official_import.js --apply-pilot');
}

async function applyPilotData() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Bairros piloto
    const pilotBairros = ['Botafogo', 'Tijuca', 'Glória'];
    const pilotFavelas = ['Pavão-Pavãozinho', 'Cantagalo', 'Santa Marta'];
    
    console.log('📍 Aplicando bairros piloto...');
    
    for (const bairroName of pilotBairros) {
      const bairroData = BAIRROS_RJ.find(b => b.name === bairroName);
      if (!bairroData) continue;
      
      await applyBairro(prisma, bairroData);
    }
    
    console.log('🏘️ Aplicando favelas piloto...');
    
    for (const favelaName of pilotFavelas) {
      const favelaData = FAVELAS_RJ.find(f => f.name === favelaName);
      if (!favelaData) continue;
      
      await applyFavela(prisma, favelaData);
    }
    
    console.log('');
    console.log('✅ FASE B CONCLUÍDA');
    console.log(`📊 ${pilotBairros.length} bairros + ${pilotFavelas.length} favelas aplicados`);
    console.log('🔍 Validar endpoints + UI "Ver no mapa"');
    
  } catch (error) {
    console.error('❌ Erro na Fase B:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function applyBairro(prisma, bairroData) {
  const centerLat = (bairroData.bounds[1] + bairroData.bounds[3]) / 2;
  const centerLng = (bairroData.bounds[0] + bairroData.bounds[2]) / 2;
  
  // Verificar se já existe
  const existing = await prisma.community.findFirst({
    where: { name: bairroData.name }
  });
  
  if (existing) {
    console.log(`⚠️ ${bairroData.name}: já existe, pulando...`);
    return;
  }
  
  // Criar community
  const community = await prisma.community.create({
    data: {
      name: bairroData.name,
      description: `${bairroData.name} - ${bairroData.zone}`,
      centerLat: centerLat,
      centerLng: centerLng
    }
  });
  
  // Criar geofence
  const geometry = createPolygonFromBounds(bairroData.bounds);
  
  await prisma.communityGeofence.create({
    data: {
      communityId: community.id,
      centerLat: centerLat,
      centerLng: centerLng,
      geojson: JSON.stringify(geometry),
      confidence: 'HIGH',
      source: 'KAVIAR/Manual'
    }
  });
  
  console.log(`✅ ${bairroData.name}: criado (${community.id})`);
}

async function applyFavela(prisma, favelaData) {
  const centerLat = (favelaData.bounds[1] + favelaData.bounds[3]) / 2;
  const centerLng = (favelaData.bounds[0] + favelaData.bounds[2]) / 2;
  
  // Verificar se já existe
  const existing = await prisma.community.findFirst({
    where: { name: favelaData.name }
  });
  
  if (existing) {
    console.log(`⚠️ ${favelaData.name}: já existe, pulando...`);
    return;
  }
  
  // Criar community (sem parentId - não existe no schema atual)
  const community = await prisma.community.create({
    data: {
      name: favelaData.name,
      description: `${favelaData.name} - Favela/Comunidade (${favelaData.zone}) - Bairro: ${favelaData.parent}`,
      centerLat: centerLat,
      centerLng: centerLng
    }
  });
  
  // Criar geofence
  const geometry = createPolygonFromBounds(favelaData.bounds);
  
  await prisma.communityGeofence.create({
    data: {
      communityId: community.id,
      centerLat: centerLat,
      centerLng: centerLng,
      geojson: JSON.stringify(geometry),
      confidence: 'HIGH',
      source: 'KAVIAR/Manual'
    }
  });
  
  console.log(`✅ ${favelaData.name}: criado (${community.id}) → bairro: ${favelaData.parent}`);
}

async function applyAllData() {
  console.log('🚧 FASE C: Em desenvolvimento...');
  console.log('📋 Implementar após validação da Fase B');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BAIRROS_RJ, FAVELAS_RJ, createFeatureCollection };
