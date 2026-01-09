#!/usr/bin/env node

/**
 * Script para validar endpoint admin/communities em produção com token real
 */

const https = require('https');

const API_BASE = 'https://kaviar-v2.onrender.com';

// Credenciais de admin (assumindo padrão)
const ADMIN_CREDENTIALS = {
  email: 'admin@kaviar.com',
  password: 'admin123'
};

const EXPECTED_IDS = {
  'Botafogo': 'cmk6ux02j0011qqr398od1msm',
  'Tijuca': 'cmk6ux8fk001rqqr371kc4ple', 
  'Glória': 'cmk6uwq9u0007qqr3pxqr64ce'
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function main() {
  console.log('🔍 KAVIAR - Validação Admin Endpoint em Produção');
  console.log('=================================================');

  // Endpoint correto de login
  const loginEndpoint = '/api/admin/auth/login';

  let token = null;
  
  console.log(`\n🔐 Testando login: ${loginEndpoint}`);
  
  try {
    const response = await makeRequest(`${API_BASE}${loginEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    console.log(`  Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success && response.data.data?.token) {
      token = response.data.data.token;
      console.log(`  ✅ Login successful! Token: ${token.substring(0, 20)}...`);
    } else {
      console.log(`  ❌ Failed:`, response.data.error || response.data);
    }
  } catch (error) {
    console.log(`  ❌ Error:`, error.message);
  }

  if (!token) {
    console.log('\n❌ Não foi possível obter token de admin');
    console.log('Testando endpoint sem autenticação...');
    
    // Testar sem auth
    const response = await makeRequest(`${API_BASE}/api/admin/communities`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    return;
  }

  // Testar endpoint admin/communities com token
  console.log('\n🔍 Testando /api/admin/communities com token...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/admin/communities`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ Endpoint funcionando! Communities: ${response.data.data.length}`);
      
      // Verificar IDs específicos
      console.log('\n🎯 Verificando IDs específicos:');
      
      const communities = response.data.data;
      
      for (const [name, expectedId] of Object.entries(EXPECTED_IDS)) {
        const found = communities.find(c => c.name === name);
        
        if (found) {
          const isCorrect = found.id === expectedId;
          console.log(`  ${isCorrect ? '✅' : '❌'} ${name}: ${found.id} ${isCorrect ? '(correto)' : `(esperado: ${expectedId})`}`);
        } else {
          console.log(`  ❌ ${name}: não encontrado`);
        }
      }
      
      // Salvar evidência
      const evidence = {
        timestamp: new Date().toISOString(),
        endpoint: '/api/admin/communities',
        status: response.status,
        success: response.data.success,
        totalCommunities: response.data.data.length,
        targetCommunities: {}
      };
      
      for (const [name, expectedId] of Object.entries(EXPECTED_IDS)) {
        const found = communities.find(c => c.name === name);
        evidence.targetCommunities[name] = {
          found: !!found,
          actualId: found?.id || null,
          expectedId: expectedId,
          isCorrect: found?.id === expectedId
        };
      }
      
      require('fs').writeFileSync(
        '/home/goes/kaviar/audit/ui_map_evidence/2026-01-09__build-b73db6a/ADMIN_ENDPOINT_EVIDENCE.json',
        JSON.stringify(evidence, null, 2)
      );
      
      console.log('\n📄 Evidência salva em: audit/ui_map_evidence/2026-01-09__build-b73db6a/ADMIN_ENDPOINT_EVIDENCE.json');
      
    } else {
      console.log('❌ Endpoint failed:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Error testing endpoint:', error.message);
  }
}

main().catch(console.error);
