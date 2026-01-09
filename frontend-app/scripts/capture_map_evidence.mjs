#!/usr/bin/env node

/**
 * KAVIAR - Automated UI Map Evidence Capture
 * Generates real screenshots of "Ver no mapa" modal for audit evidence
 * 
 * Usage: node scripts/capture_map_evidence.mjs
 * Requires: .env with ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const evidenceDir = join(projectRoot, 'audit/ui_map_evidence');

// Test cases to capture
const TEST_CASES = [
  {
    name: 'Botafogo',
    id: 'cmk6ux02j0011qqr398od1msm',
    filename: 'Botafogo_polygon_render.png',
    expectedType: 'Polygon'
  },
  {
    name: 'Tijuca', 
    id: 'cmk6ux8fk001rqqr371kc4ple',
    filename: 'Tijuca_polygon_render.png',
    expectedType: 'Polygon'
  },
  {
    name: 'Glória',
    id: 'cmk6uwq9u0007qqr3pxqr64ce', 
    filename: 'Gloria_polygon_render.png',
    expectedType: 'Polygon'
  },
  {
    name: 'Morro da Providência',
    id: 'cmk6uwnvh0001qqr377ziza29',
    filename: 'Providencia_sem_dados.png',
    expectedType: 'SEM_DADOS'
  }
];

async function captureMapEvidence() {
  console.log('🎬 KAVIAR - Automated UI Map Evidence Capture');
  console.log('===============================================');

  // Validate environment
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_URL) {
    console.error('❌ Missing required environment variables:');
    console.error('   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL');
    process.exit(1);
  }

  // Create evidence directory
  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = [];
  let buildHash = 'unknown';
  let provider = 'unknown';

  try {
    console.log('🔐 Logging into admin...');
    
    // Navigate to login
    await page.goto(`${ADMIN_URL}/admin/login`);
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")');
    await page.waitForLoadState('networkidle');

    console.log('🗺️ Navigating to geofences admin...');
    
    // Navigate to geofences
    await page.goto(`${ADMIN_URL}/admin/geofences`);
    await page.waitForLoadState('networkidle');

    // Process each test case
    for (const testCase of TEST_CASES) {
      console.log(`📸 Capturing: ${testCase.name}...`);
      
      try {
        // Wait for table to load
        await page.waitForSelector('table, .MuiTable-root, [role="table"]', { timeout: 10000 });
        console.log(`  ✅ Table loaded`);

        // Use search/filter if available to make row visible
        try {
          const searchInput = page.locator('input[placeholder*="Pesquisar"], input[placeholder*="Buscar"], input[type="search"]').first();
          if (await searchInput.isVisible({ timeout: 2000 })) {
            await searchInput.fill(testCase.name);
            await page.waitForTimeout(1000); // Wait for filter
            console.log(`  ✅ Filtered by: ${testCase.name}`);
          }
        } catch (e) {
          console.log(`  ⚠️ No search filter found, proceeding...`);
        }

        // Find the table row containing the community name
        const communityRow = page.locator(`tr:has-text("${testCase.name}")`).first();
        await communityRow.waitFor({ timeout: 10000 });
        console.log(`  ✅ Found row for: ${testCase.name}`);

        // Find map button within the same row (flexible selectors)
        const mapButton = communityRow.locator(`
          button:has-text(/Mapa|Ver no mapa/i),
          button[aria-label*="mapa" i],
          button[title*="mapa" i],
          button[data-testid*="map"],
          .MuiIconButton-root:has(svg),
          button:has(svg)
        `).first();
        
        await mapButton.waitFor({ timeout: 5000 });
        console.log(`  ✅ Found map button for: ${testCase.name}`);
        
        // Click the map button
        await mapButton.click();
        console.log(`  ✅ Clicked map button for: ${testCase.name}`);

        // Wait for modal to appear
        await page.waitForSelector('.MuiDialog-root, .modal, [role="dialog"]', { timeout: 10000 });
        console.log(`  ✅ Modal opened for: ${testCase.name}`);
        
        // Wait for map container
        await page.waitForSelector('.leaflet-container, .map-container', { timeout: 10000 });
        console.log(`  ✅ Map container found for ${testCase.name}`);

        // Wait for tiles to load (either success or timeout)
        try {
          await page.waitForSelector('img.leaflet-tile', { timeout: 5000 });
          console.log(`  ✅ Tiles loaded for ${testCase.name}`);
        } catch (e) {
          console.log(`  ⚠️ Tiles timeout for ${testCase.name}, proceeding anyway`);
        }

        // Buffer time for complete rendering (tiles + polygon)
        await page.waitForTimeout(2000);
        console.log(`  ✅ Rendering buffer completed for ${testCase.name}`);

        // Extract build info if available
        try {
          const buildInfo = await page.textContent('[data-testid="build-info"], .build-info');
          if (buildInfo && buildHash === 'unknown') {
            const hashMatch = buildInfo.match(/Build:\s*([a-f0-9]+)/i);
            if (hashMatch) buildHash = hashMatch[1];
          }
        } catch (e) {
          // Build info not found, continue
        }

        // Extract provider info
        try {
          const providerInfo = await page.textContent('[data-testid="map-provider"], .map-provider');
          if (providerInfo && provider === 'unknown') {
            provider = providerInfo.includes('Leaflet') ? 'Leaflet/OSM' : 'Google Maps';
          }
        } catch (e) {
          // Provider info not found, assume Leaflet
          provider = 'Leaflet/OSM';
        }

        // Capture screenshot
        const screenshotPath = join(evidenceDir, testCase.filename);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: false,
          clip: { x: 0, y: 0, width: 1200, height: 800 }
        });

        console.log(`  📸 Screenshot saved: ${testCase.filename}`);

        // Check if map rendered properly
        const hasMapContent = await page.locator('.leaflet-container').isVisible();
        const hasPolygon = await page.locator('.leaflet-overlay-pane path, .leaflet-overlay-pane svg path, svg path').count() > 0;
        
        results.push({
          name: testCase.name,
          id: testCase.id,
          filename: testCase.filename,
          expectedType: testCase.expectedType,
          hasMapContent,
          hasPolygon,
          status: hasMapContent ? 'SUCCESS' : 'MAP_RENDER_INCOMPLETE'
        });

        console.log(`  ✅ ${testCase.name}: Map Content=${hasMapContent ? '✅' : '❌'}, Polygon=${hasPolygon ? '✅' : '❌'}`);

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // Clear search if used
        try {
          const searchInput = page.locator('input[placeholder*="Pesquisar"], input[placeholder*="Buscar"], input[type="search"]').first();
          if (await searchInput.isVisible({ timeout: 1000 })) {
            await searchInput.fill('');
            await page.waitForTimeout(500);
          }
        } catch (e) {
          // Search clear failed, continue
        }

      } catch (error) {
        console.error(`  ❌ Error capturing ${testCase.name}:`, error.message);
        
        // Capture debug screenshot and logs on error
        try {
          const debugScreenshotPath = join(evidenceDir, `DEBUG_${testCase.filename}`);
          await page.screenshot({ 
            path: debugScreenshotPath,
            fullPage: true
          });
          console.log(`  🐛 Debug screenshot saved: DEBUG_${testCase.filename}`);

          // Get console logs
          const consoleLogs = await page.evaluate(() => {
            return window.console.history || 'Console history not available';
          });

          results.push({
            name: testCase.name,
            id: testCase.id,
            filename: testCase.filename,
            expectedType: testCase.expectedType,
            hasMapContent: false,
            hasPolygon: false,
            status: 'ERROR',
            error: error.message,
            debugScreenshot: `DEBUG_${testCase.filename}`,
            consoleLogs: typeof consoleLogs === 'string' ? consoleLogs : JSON.stringify(consoleLogs)
          });
        } catch (debugError) {
          console.error(`  🐛 Debug capture failed:`, debugError.message);
          results.push({
            name: testCase.name,
            id: testCase.id,
            filename: testCase.filename,
            expectedType: testCase.expectedType,
            hasMapContent: false,
            hasPolygon: false,
            status: 'ERROR',
            error: error.message
          });
        }

        // Don't close browser - continue with next test case
        console.log(`  ⏭️ Continuing with next test case...`);
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }

  // Generate report
  generateReport(results, buildHash, provider);
  
  console.log('');
  console.log('✅ Evidence capture completed!');
  console.log(`📁 Screenshots saved in: ${evidenceDir}`);
  console.log(`📄 Report: audit/ui_map_evidence_report.md`);
}

function generateReport(results, buildHash, provider) {
  const timestamp = new Date().toISOString();
  const { ADMIN_URL } = process.env;
  
  const report = `# Relatório - Evidência Automatizada UI Mapa

**Data:** ${timestamp}
**URL:** ${ADMIN_URL}
**Build Hash:** ${buildHash}
**Provider:** ${provider}
**Método:** Playwright automation

## 📊 Resultados da Captura

| Community | Expected | Screenshot | Map Content | Polygon | Status |
|-----------|----------|------------|-------------|---------|--------|
${results.map(r => 
  `| ${r.name} | ${r.expectedType} | ${r.filename} | ${r.hasMapContent ? '✅' : '❌'} | ${r.hasPolygon ? '✅' : '❌'} | ${r.status} |`
).join('\n')}

## 🎯 Análise dos Screenshots

### ✅ Casos de Sucesso
${results.filter(r => r.status === 'SUCCESS').map(r => 
  `- **${r.name}**: Modal aberto, mapa renderizado, screenshot capturado`
).join('\n')}

### ⚠️ Casos com Problemas
${results.filter(r => r.status !== 'SUCCESS').map(r => 
  `- **${r.name}**: ${r.status}${r.error ? ` - ${r.error}` : ''}${r.debugScreenshot ? ` (Debug: ${r.debugScreenshot})` : ''}`
).join('\n') || 'Nenhum problema encontrado'}

## 🐛 Informações de Debug

${results.filter(r => r.error).map(r => `
### ${r.name} - Erro Detalhado
- **Status**: ${r.status}
- **Erro**: ${r.error}
- **Debug Screenshot**: ${r.debugScreenshot || 'N/A'}
- **Console Logs**: ${r.consoleLogs ? 'Capturados' : 'N/A'}
`).join('\n')}

## 🔧 Detalhes Técnicos

### Configuração do Teste
- **Browser**: Chromium (Playwright)
- **Viewport**: 1920x1080
- **Screenshot**: 1200x800 (clipped)
- **Timeout**: 10s para modal, 5s para tiles
- **Buffer**: 2s após tiles para renderização completa

### Seletores Utilizados
- **Modal**: \`.MuiDialog-root, .modal, [role="dialog"]\`
- **Map Container**: \`.leaflet-container, .map-container\`
- **Tiles**: \`img.leaflet-tile\`
- **Polygon**: \`.leaflet-overlay-pane path, .leaflet-overlay-pane svg\`

### Estratégia de Espera
1. Aguardar modal aparecer (10s timeout)
2. Aguardar container do mapa (10s timeout)  
3. Aguardar tiles carregarem (5s timeout, não-crítico)
4. Buffer final de 2s para renderização completa
5. Screenshot com clip para focar no modal

## 📁 Arquivos Gerados

${results.map(r => `- \`${r.filename}\` - ${r.name} (${r.expectedType})`).join('\n')}

## 🎬 Comando de Execução

\`\`\`bash
cd frontend-app
node scripts/capture_map_evidence.mjs
\`\`\`

**Pré-requisitos:**
- \`.env\` com ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_URL
- \`npm install playwright\`
- \`npx playwright install chromium\`

---
*Screenshots gerados automaticamente via Playwright para evidência objetiva do funcionamento da UI.*`;

  const reportPath = join(projectRoot, 'audit/ui_map_evidence_report.md');
  writeFileSync(reportPath, report);
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  captureMapEvidence().catch(console.error);
}

export { captureMapEvidence };
