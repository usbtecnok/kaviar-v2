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

// Target neighborhoods
const TARGET_BAIRROS = [
  'Ipanema',
  'Copacabana', 
  'Leme',
  'Barra da Tijuca',
  'Joá',
  'Alto da Boa Vista'
];

// ArcGIS API endpoint
const ARCGIS_BASE = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Cartografia/Limites_administrativos/MapServer/4/query';

async function fetchFromArcGIS() {
  console.log('🔍 Fetching neighborhoods from Rio ArcGIS API...');
  
  // Build WHERE clause for target neighborhoods
  const whereClause = TARGET_BAIRROS.map(name => `nome LIKE '%${name}%'`).join(' OR ');
  
  const params = new URLSearchParams({
    where: whereClause,
    outFields: 'nome',
    returnGeometry: 'true',
    f: 'geojson',
    outSR: '4326'
  });

  const url = `${ARCGIS_BASE}?${params}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          // Check if we got ESRI JSON instead of GeoJSON
          if (parsed.features && parsed.features[0] && parsed.features[0].geometry && parsed.features[0].geometry.rings) {
            console.log('⚠️  Got ESRI JSON format, converting to GeoJSON...');
            resolve(convertEsriToGeoJSON(parsed));
          } else if (parsed.type === 'FeatureCollection') {
            console.log('✅ Got GeoJSON format');
            resolve(parsed);
          } else {
            reject(new Error('Unknown response format from ArcGIS API'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse ArcGIS response: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

function convertEsriToGeoJSON(esriData) {
  const features = esriData.features.map(feature => {
    const { rings } = feature.geometry;
    
    // Convert rings to GeoJSON Polygon coordinates
    let coordinates;
    if (rings.length === 1) {
      coordinates = [rings[0]];
    } else {
      // Multiple rings - first is exterior, rest are holes
      coordinates = rings;
    }
    
    return {
      type: 'Feature',
      properties: {
        name: feature.attributes?.nome ?? feature.attributes?.NOME ?? ''
      },
      geometry: {
        type: 'Polygon',
        coordinates: coordinates
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features: features
  };
}

async function importToKaviar(geojson) {
  console.log('📤 Importing to KAVIAR...');
  
  const payload = {
    type: 'bairro',
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
  console.log('\n📊 IMPORT REPORT');
  console.log('================');
  
  const found = geojson.features
    .map(f => f?.properties?.name)
    .filter(Boolean)
    .map(name => String(name).trim());

  const missing = TARGET_BAIRROS.filter(target =>
    !found.some(name => name.toLowerCase().includes(target.toLowerCase()))
  );

  console.log(`🎯 Target neighborhoods: ${TARGET_BAIRROS.length}`);
  console.log(`🔍 Found in ArcGIS: ${found.length}`);
  console.log(`📥 Total processed: ${importResult.summary.total}`);
  console.log(`✅ Inserted: ${importResult.summary.inserted}`);
  console.log(`🔄 Updated: ${importResult.summary.updated}`);
  console.log(`❌ Errors: ${importResult.summary.errors}`);

  if (found.length > 0) {
    console.log('\n✅ FOUND NEIGHBORHOODS:');
    found.forEach(name => console.log(`  • ${name}`));
  }

  if (missing.length > 0) {
    console.log('\n❌ MISSING NEIGHBORHOODS:');
    missing.forEach(name => console.log(`  • ${name}`));
  }

  if (importResult.errors && importResult.errors.length > 0) {
    console.log('\n⚠️  IMPORT ERRORS:');
    importResult.errors.forEach(error => console.log(`  • ${error}`));
  }

  console.log(`\n🌐 Test resolve: ${BASE_URL}/api/geo/resolve?lat=-22.9868&lon=-43.2050`);
}

async function main() {
  try {
    console.log('🚀 Starting Rio neighborhoods import...');
    
    const geojson = await fetchFromArcGIS();
    
    if (!geojson.features || geojson.features.length === 0) {
      console.log('❌ No neighborhoods found in ArcGIS API');
      return;
    }

    const importResult = await importToKaviar(geojson);
    generateReport(geojson, importResult);
    
    console.log('\n🎉 Import completed successfully!');
    
  } catch (error) {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
