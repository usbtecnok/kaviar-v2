#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Environment variables
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ ADMIN_TOKEN environment variable is required');
  process.exit(1);
}

// Target communities within our bairros
const TARGET_COMUNIDADES = [
  'Cantagalo',
  'Pavão-Pavãozinho', 
  'Pavao-Pavãozinho',
  'Tabajaras',
  'Chapéu Mangueira',
  'Chapeu Mangueira',
  'Babilônia',
  'Babilonia'
];

const TARGET_BAIRROS = ['Copacabana', 'Leme', 'Ipanema'];

// SABREN FeatureServer endpoint
const SABREN_BASE = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/SABREN/Limites_de_Favelas/FeatureServer/13/query';

async function fetchFromSABREN() {
  console.log('🔍 Fetching communities from SABREN FeatureServer...');
  
  // Build WHERE clause for communities in target bairros
  const bairroClause = TARGET_BAIRROS.map(b => `bairro LIKE '%${b}%'`).join(' OR ');
  const nomeClause = TARGET_COMUNIDADES.map(n => `nome LIKE '%${n}%'`).join(' OR ');
  const whereClause = `(${bairroClause}) AND (${nomeClause})`;
  
  const params = new URLSearchParams({
    where: whereClause,
    outFields: 'nome,bairro,complexo,cod_favela',
    returnGeometry: 'true',
    f: 'geojson',
    outSR: '4326'
  });

  const url = `${SABREN_BASE}?${params}`;
  console.log('📡 Query:', whereClause);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.type === 'FeatureCollection') {
            console.log('✅ Got GeoJSON format');
            
            // Normalize properties and guard against undefined
            parsed.features = parsed.features.map(feature => ({
              ...feature,
              properties: {
                name: feature.properties?.nome || feature.properties?.NOME || 'unnamed',
                bairro: feature.properties?.bairro || '',
                complexo: feature.properties?.complexo || '',
                cod_favela: feature.properties?.cod_favela || ''
              }
            }));
            
            resolve(parsed);
          } else {
            reject(new Error('Expected FeatureCollection from SABREN API'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse SABREN response: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function importToKaviar(geojson) {
  console.log('📤 Importing communities to KAVIAR...');
  
  const payload = {
    type: 'comunidade',
    city: 'Rio de Janeiro',
    geojson: geojson
  };

  const postData = JSON.stringify(payload);
  const url = new URL(`${BASE_URL}/api/admin/geofence/import-geojson`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
  };

  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || data}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function generateReport(geojson, importResult) {
  console.log('\n📊 COMMUNITIES IMPORT REPORT');
  console.log('============================');
  
  const found = geojson.features.map(f => ({
    name: f.properties.name,
    bairro: f.properties.bairro,
    complexo: f.properties.complexo
  }));
  
  const foundNames = found.map(f => f.name);
  const missing = TARGET_COMUNIDADES.filter(target => 
    !foundNames.some(name => name.toLowerCase().includes(target.toLowerCase()))
  );

  console.log(`🎯 Target communities: ${TARGET_COMUNIDADES.length}`);
  console.log(`🔍 Found in SABREN: ${found.length}`);
  console.log(`📥 Total processed: ${importResult.summary.total}`);
  console.log(`✅ Inserted: ${importResult.summary.inserted}`);
  console.log(`🔄 Updated: ${importResult.summary.updated}`);
  console.log(`❌ Errors: ${importResult.summary.errors}`);

  if (found.length > 0) {
    console.log('\n✅ FOUND COMMUNITIES:');
    found.forEach(f => {
      const bairroInfo = f.bairro ? ` (${f.bairro})` : '';
      const complexoInfo = f.complexo ? ` [${f.complexo}]` : '';
      console.log(`  • ${f.name}${bairroInfo}${complexoInfo}`);
    });
  }

  if (missing.length > 0) {
    console.log('\n❌ MISSING COMMUNITIES:');
    missing.forEach(name => console.log(`  • ${name}`));
  }

  if (importResult.errors && importResult.errors.length > 0) {
    console.log('\n⚠️  IMPORT ERRORS:');
    importResult.errors.forEach(error => console.log(`  • ${error}`));
  }

  console.log(`\n🌐 Test resolve (Babilônia): ${BASE_URL}/api/geo/resolve?lat=-22.9665&lon=-43.1611`);
  console.log(`🌐 Test resolve (Copacabana): ${BASE_URL}/api/geo/resolve?lat=-22.9711&lon=-43.1822`);
}

async function main() {
  try {
    console.log('🚀 Starting Rio communities import...');
    
    const geojson = await fetchFromSABREN();
    
    if (!geojson.features || geojson.features.length === 0) {
      console.log('❌ No communities found in SABREN API');
      return;
    }

    const importResult = await importToKaviar(geojson);
    generateReport(geojson, importResult);
    
    console.log('\n🎉 Communities import completed successfully!');
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
