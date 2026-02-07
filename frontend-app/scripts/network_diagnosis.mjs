#!/usr/bin/env node

/**
 * Diagnóstico completo de rede - Capturar endpoint real da tabela
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.KAVIAR_FRONTEND_URL || 'https://kaviar-frontend.onrender.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@kaviar.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (ADMIN_PASSWORD=z4939ia4) throw new Error('ADMIN_PASSWORD missing');

const TARGET_COMMUNITIES = ['Botafogo', 'Tijuca', 'Glória'];
const EVIDENCE_DIR = '/home/goes/kaviar/audit/ui_map_evidence/2026-01-09__build-b73db6a';

async function main() {
  console.log('🔍 KAVIAR - Network Diagnosis (Table Endpoint)');
  console.log('==============================================');

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();
  
  // Limpar cookies
  await context.clearCookies();

  const networkLog = [];
  const tableEndpointData = {};

  // Monitorar TODAS as requisições
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    
    console.log(`📡 REQUEST: ${method} ${url}`);
    
    networkLog.push({
      type: 'request',
      method,
      url,
      headers: request.headers(),
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    
    console.log(`📨 RESPONSE: ${status} ${url}`);
    
    const logEntry = {
      type: 'response',
      url,
      status,
      headers: response.headers(),
      timestamp: new Date().toISOString()
    };

    // Capturar body de endpoints relevantes
    if (url.includes('/api/admin/communities') || 
        url.includes('/api/governance/communities') ||
        url.includes('communities') ||
        url.includes('geofence')) {
      
      try {
        const body = await response.text();
        logEntry.body = body;
        
        // Se é o endpoint da tabela, analisar IDs
        if (url.includes('/api/admin/communities') && status === 200) {
          console.log(`🎯 ENDPOINT DA TABELA CAPTURADO: ${url}`);
          
          try {
            const data = JSON.parse(body);
            if (data.success && data.data) {
              tableEndpointData.url = url;
              tableEndpointData.status = status;
              tableEndpointData.totalCommunities = data.data.length;
              tableEndpointData.targetCommunities = {};
              
              for (const communityName of TARGET_COMMUNITIES) {
                const found = data.data.find(c => c.name === communityName);
                if (found) {
                  tableEndpointData.targetCommunities[communityName] = {
                    id: found.id,
                    name: found.name
                  };
                  console.log(`  📍 ${communityName}: ${found.id}`);
                }
              }
            }
          } catch (e) {
            console.log(`  ❌ Erro ao parsear JSON: ${e.message}`);
          }
        }
      } catch (e) {
        logEntry.bodyError = e.message;
      }
    }

    networkLog.push(logEntry);
  });

  try {
    // Login
    console.log('\n🔐 Fazendo login...');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/**', { timeout: 10000 });
    console.log('✅ Login realizado');

    // Navegar para geofences
    console.log('\n🗺️ Navegando para admin geofences...');
    await page.goto(`${BASE_URL}/admin/geofences`, { waitUntil: 'networkidle' });
    
    // Aguardar mais tempo para JavaScript carregar
    console.log('⏳ Aguardando JavaScript carregar...');
    await page.waitForTimeout(5000);
    
    // Tentar encontrar tabela ou qualquer elemento que indique carregamento
    try {
      await page.waitForSelector('table, .MuiTable-root, [role="table"]', { timeout: 15000 });
      console.log('✅ Tabela encontrada');
    } catch (e) {
      console.log('⚠️ Tabela não encontrada, tentando outros seletores...');
      
      // Verificar se há erro de JavaScript
      const errors = await page.evaluate(() => {
        return window.errors || [];
      });
      
      if (errors.length > 0) {
        console.log('❌ Erros JavaScript detectados:', errors);
      }
      
      // Tentar outros seletores
      const selectors = [
        '.MuiDataGrid-root',
        '[data-testid="communities-table"]',
        '.communities-table',
        'tbody tr',
        '.table-container'
      ];
      
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          console.log(`✅ Elemento encontrado: ${selector}`);
          break;
        } catch (e) {
          console.log(`❌ Não encontrado: ${selector}`);
        }
      }
    }

    // Aguardar um pouco mais para capturar todas as requisições
    await page.waitForTimeout(3000);

    // Analisar hosts de todas as requisições
    console.log('\n🌐 Análise de Hosts:');
    const hosts = new Set();
    const apiCalls = networkLog.filter(log => 
      log.type === 'request' && log.url.includes('/api/')
    );

    apiCalls.forEach(call => {
      try {
        const url = new URL(call.url);
        hosts.add(url.origin);
      } catch (e) {
        console.log(`❌ URL inválida: ${call.url}`);
      }
    });

    hosts.forEach(host => {
      console.log(`  🌍 Host encontrado: ${host}`);
    });

    if (hosts.size > 1) {
      console.log('⚠️  MÚLTIPLOS HOSTS DETECTADOS - POSSÍVEL CAUSA DO BUG!');
    }

    // Salvar evidência completa
    const evidence = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      hostsFound: Array.from(hosts),
      multipleHosts: hosts.size > 1,
      tableEndpoint: tableEndpointData,
      networkLog: networkLog,
      summary: {
        totalRequests: networkLog.filter(l => l.type === 'request').length,
        totalResponses: networkLog.filter(l => l.type === 'response').length,
        apiCalls: apiCalls.length,
        uniqueHosts: hosts.size
      }
    };

    const evidenceFile = path.join(EVIDENCE_DIR, 'NETWORK_DIAGNOSIS.json');
    fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));
    console.log(`\n📄 Evidência salva: ${evidenceFile}`);

    // Relatório resumido
    console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
    console.log(`  🌍 Hosts únicos: ${hosts.size}`);
    console.log(`  📡 Total de requests: ${evidence.summary.totalRequests}`);
    console.log(`  📨 Total de responses: ${evidence.summary.totalResponses}`);
    console.log(`  🔗 API calls: ${evidence.summary.apiCalls}`);
    
    if (tableEndpointData.url) {
      console.log(`  🎯 Endpoint da tabela: ${tableEndpointData.url}`);
      console.log(`  📊 Communities na tabela: ${tableEndpointData.totalCommunities}`);
      
      for (const [name, data] of Object.entries(tableEndpointData.targetCommunities || {})) {
        console.log(`    📍 ${name}: ${data.id}`);
      }
    } else {
      console.log('  ❌ Endpoint da tabela NÃO capturado');
    }

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
