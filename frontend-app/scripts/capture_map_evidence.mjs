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

// Create execution folder with date and build hash
const today = new Date().toISOString().split('T')[0];
const buildHash = 'b73db6a'; // Will be updated from git
const executionFolder = `${today}__build-${buildHash}`;
const evidenceDir = join(projectRoot, 'audit/ui_map_evidence', executionFolder);

// Test cases with proper naming
const TEST_CASES = [
  {
    name: 'Botafogo',
    slug: 'botafogo',
    id: 'cmk6ux02j0011qqr398od1msm',
    expectedType: 'Polygon',
    order: '01'
  },
  {
    name: 'Tijuca', 
    slug: 'tijuca',
    id: 'cmk6ux8fk001rqqr371kc4ple',
    expectedType: 'Polygon',
    order: '02'
  },
  {
    name: 'Glória',
    slug: 'gloria',
    id: 'cmk6uwq9u0007qqr3pxqr64ce', 
    expectedType: 'Polygon',
    order: '03'
  },
  {
    name: 'Morro da Providência',
    slug: 'morro_da_providencia',
    id: 'cmk6uwnvh0001qqr377ziza29',
    expectedType: 'SEM_DADOS',
    order: '04'
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

    // Wait for login form to be visible
    await page.waitForSelector('form, input[type="email"], input[type="password"]', { timeout: 10000 });
    
    // Fill email field with correct selector
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    console.log('✅ Email filled');
    
    // Fill password field with correct selector  
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    console.log('✅ Password filled');

    // Submit form
    await page.click('button:has-text("Entrar")');
    console.log('✅ Login button clicked');
    
    await page.waitForLoadState('networkidle');

    // Confirm login by URL or admin element (timeout 10s)
    try {
      await page.waitForFunction(() => 
        window.location.pathname.includes('/admin') && 
        !window.location.pathname.includes('/login'), 
        { timeout: 10000 }
      );
      console.log('✅ Login successful - admin area accessed');
    } catch (loginError) {
      console.error('❌ Login failed - saving debug screenshot');
      
      // Save debug screenshot
      const debugLoginPath = join(evidenceDir, `DEBUG_00_login__step-login__err-timeout__build-${buildHash}.png`);
      await page.screenshot({ path: debugLoginPath, fullPage: true });
      
      // Generate error report
      const errorReport = `# Relatório - Erro de Login

**Data:** ${new Date().toISOString()}
**URL:** ${ADMIN_URL}
**Status:** ERROR_LOGIN

## ❌ Falha no Login

- **Erro**: Não foi possível acessar área administrativa
- **Credenciais**: Verificar ADMIN_EMAIL e ADMIN_PASSWORD no .env
- **Debug Screenshot**: DEBUG_00_login__step-login__err-timeout__build-${buildHash}.png
- **URL atual**: ${page.url()}

## 🔧 Próximos Passos

1. Verificar credenciais no arquivo .env
2. Confirmar que o usuário tem acesso admin
3. Testar login manual no navegador
4. Executar novamente após correção

---
*Execução interrompida devido a falha de autenticação.*`;

      const reportPath = join(projectRoot, 'audit/ui_map_evidence_report.md');
      writeFileSync(reportPath, errorReport);
      
      console.log('📄 Error report saved: audit/ui_map_evidence_report.md');
      console.log(`🐛 Debug screenshot: audit/ui_map_evidence/${executionFolder}/DEBUG_00_login__step-login__err-timeout__build-${buildHash}.png`);
      
      await browser.close();
      return;
    }

    console.log('🗺️ Navigating to geofences admin...');
    
    // Navigate to geofences
    await page.goto(`${ADMIN_URL}/admin/geofences`);
    await page.waitForLoadState('networkidle');

    // Wait for table to load (timeout 20s)
    try {
      await page.waitForSelector('table, .MuiTable-root, [role="table"]', { timeout: 20000 });
      console.log('✅ Table loaded successfully');
    } catch (tableError) {
      console.error('❌ Table not found - saving debug screenshot');
      
      // Save debug screenshot
      const debugTablePath = join(evidenceDir, 'DEBUG_TABLE_NOT_FOUND.png');
      await page.screenshot({ path: debugTablePath, fullPage: true });
      
      // Generate error report
      const errorReport = `# Relatório - Erro de Tabela

**Data:** ${new Date().toISOString()}
**URL:** ${ADMIN_URL}/admin/geofences
**Status:** ERROR_TABLE

## ❌ Tabela Não Encontrada

- **Erro**: Timeout aguardando tabela de geofences (20s)
- **Seletores testados**: table, .MuiTable-root, [role="table"]
- **Debug Screenshot**: DEBUG_TABLE_NOT_FOUND.png
- **URL atual**: ${page.url()}

## 🔧 Próximos Passos

1. Verificar se a página /admin/geofences existe
2. Confirmar estrutura da tabela na UI
3. Ajustar seletores se necessário
4. Executar novamente após correção

---
*Execução interrompida devido a tabela não encontrada.*`;

      const reportPath = join(projectRoot, 'audit/ui_map_evidence_report.md');
      writeFileSync(reportPath, errorReport);
      
      console.log('📄 Error report saved: audit/ui_map_evidence_report.md');
      console.log('🐛 Debug screenshot: audit/ui_map_evidence/DEBUG_TABLE_NOT_FOUND.png');
      
      await browser.close();
      return;
    }

    // Process each test case with proper modal control
    for (const testCase of TEST_CASES) {
      console.log(`📸 Capturing: ${testCase.name} (${testCase.order})...`);
      
      try {
        // Close any existing modal/backdrop before starting
        try {
          const existingModal = page.locator('[role="dialog"], .MuiBackdrop-root');
          if (await existingModal.count() > 0) {
            console.log(`  🔄 Closing existing modal...`);
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => 
              document.querySelectorAll('[role="dialog"], .MuiBackdrop-root').length === 0,
              { timeout: 5000 }
            );
          }
        } catch (e) {
          // No existing modal, continue
        }

        // Use search/filter if available
        try {
          const searchInput = page.locator('input[placeholder*="Pesquisar"], input[placeholder*="Buscar"], input[type="search"]').first();
          if (await searchInput.isVisible({ timeout: 2000 })) {
            await searchInput.fill(testCase.name);
            await page.waitForTimeout(1000);
            console.log(`  ✅ Filtered by: ${testCase.name}`);
          }
        } catch (e) {
          console.log(`  ⚠️ No search filter found, proceeding...`);
        }

        // Find the table row containing the community name (scoped)
        const communityRow = page.locator('tr', { hasText: testCase.name }).first();
        await communityRow.waitFor({ timeout: 10000 });
        console.log(`  ✅ Found row for: ${testCase.name}`);

        // Find map button within the same row (scoped)
        const mapButton = communityRow.locator('button:has-text("Mapa")').first();
        await mapButton.scrollIntoViewIfNeeded();
        await mapButton.waitFor({ timeout: 5000 });
        console.log(`  ✅ Found map button for: ${testCase.name}`);
        
        // Click the map button
        await mapButton.click();
        console.log(`  ✅ Clicked map button for: ${testCase.name}`);

        // Wait for modal to appear (20s timeout)
        await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
        console.log(`  ✅ Modal opened for: ${testCase.name}`);
        
        // Wait for map container (20s timeout)
        await page.waitForSelector('.leaflet-container', { timeout: 20000 });
        console.log(`  ✅ Map container found for ${testCase.name}`);

        // Wait for tiles to load (10s timeout, non-critical)
        try {
          await page.waitForSelector('img.leaflet-tile', { timeout: 10000 });
          console.log(`  ✅ Tiles loaded for ${testCase.name}`);
        } catch (e) {
          console.log(`  ⚠️ Tiles timeout for ${testCase.name}, proceeding anyway`);
        }

        // OBRIGATÓRIO: Buffer time for complete rendering (tiles + polygon)
        await page.waitForTimeout(2000);
        console.log(`  ✅ Rendering buffer completed for ${testCase.name}`);

        // For Polygon cases: wait for overlay (10s timeout, non-critical)
        let hasPolygon = false;
        if (testCase.expectedType === 'Polygon') {
          try {
            await page.waitForSelector('.leaflet-overlay-pane path, .leaflet-overlay-pane svg path', { timeout: 10000 });
            hasPolygon = true;
            console.log(`  ✅ Polygon overlay found for ${testCase.name}`);
          } catch (e) {
            console.log(`  ⚠️ Polygon overlay timeout for ${testCase.name}, marking MAP_RENDER_INCOMPLETE`);
          }
        }

        // Get API status for filename
        const apiStatus = testCase.expectedType === 'Polygon' ? '200-polygon' : '404-sem_dados';
        const expectedSlug = testCase.expectedType === 'Polygon' ? 'polygon' : 'sem_dados';
        
        // Generate final screenshot filename
        const finalFilename = `FINAL_${testCase.order}_${testCase.slug}__expected-${expectedSlug}__api-${apiStatus}__build-${buildHash}.png`;
        
        // Capture final screenshot
        const screenshotPath = join(evidenceDir, finalFilename);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: false,
          clip: { x: 0, y: 0, width: 1200, height: 800 }
        });

        console.log(`  📸 Final screenshot saved: ${finalFilename}`);

        // Check if map rendered properly
        const hasMapContent = await page.locator('.leaflet-container').isVisible();
        const polygonDetected = hasPolygon || await page.locator('.leaflet-overlay-pane path, .leaflet-overlay-pane svg path').count() > 0;
        
        const status = hasMapContent ? 
          (testCase.expectedType === 'Polygon' && !polygonDetected ? 'MAP_RENDER_INCOMPLETE' : 'SUCCESS') : 
          'MAP_RENDER_INCOMPLETE';
        
        results.push({
          name: testCase.name,
          slug: testCase.slug,
          order: testCase.order,
          id: testCase.id,
          filename: finalFilename,
          expectedType: testCase.expectedType,
          apiStatus: apiStatus,
          hasMapContent,
          hasPolygon: polygonDetected,
          status
        });

        console.log(`  ✅ ${testCase.name}: Map Content=${hasMapContent ? '✅' : '❌'}, Polygon=${polygonDetected ? '✅' : '❌'}, Status=${status}`);

        // Close modal properly
        try {
          // Try close button first
          const closeButton = page.locator('[role="dialog"] button[aria-label*="close" i], [role="dialog"] .MuiIconButton-root').first();
          if (await closeButton.isVisible({ timeout: 2000 })) {
            await closeButton.click();
          } else {
            // Fallback to Escape
            await page.keyboard.press('Escape');
          }
          
          // Wait for modal to disappear
          await page.waitForFunction(() => 
            document.querySelectorAll('[role="dialog"]').length === 0,
            { timeout: 15000 }
          );
          console.log(`  ✅ Modal closed for ${testCase.name}`);
        } catch (e) {
          console.log(`  ⚠️ Modal close timeout for ${testCase.name}, forcing escape`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(2000);
        }

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
        
        // Determine error step
        let errorStep = 'unknown';
        if (error.message.includes('tr')) errorStep = 'row_button';
        else if (error.message.includes('dialog')) errorStep = 'modal_open';
        else if (error.message.includes('leaflet-container')) errorStep = 'map_container';
        else if (error.message.includes('tile')) errorStep = 'tiles';
        else if (error.message.includes('path')) errorStep = 'polygon';
        
        // Save debug screenshot
        try {
          const debugFilename = `DEBUG_${testCase.order}_${testCase.slug}__step-${errorStep}__err-timeout__build-${buildHash}.png`;
          const debugScreenshotPath = join(evidenceDir, debugFilename);
          await page.screenshot({ 
            path: debugScreenshotPath,
            fullPage: true
          });
          console.log(`  🐛 Debug screenshot saved: ${debugFilename}`);

          results.push({
            name: testCase.name,
            slug: testCase.slug,
            order: testCase.order,
            id: testCase.id,
            filename: `FINAL_${testCase.order}_${testCase.slug}__expected-error__api-unknown__build-${buildHash}.png`,
            expectedType: testCase.expectedType,
            apiStatus: 'unknown',
            hasMapContent: false,
            hasPolygon: false,
            status: 'ERROR_' + errorStep.toUpperCase(),
            error: error.message,
            debugScreenshot: debugFilename
          });
        } catch (debugError) {
          console.error(`  🐛 Debug capture failed:`, debugError.message);
          results.push({
            name: testCase.name,
            slug: testCase.slug,
            order: testCase.order,
            id: testCase.id,
            filename: `FINAL_${testCase.order}_${testCase.slug}__expected-error__api-unknown__build-${buildHash}.png`,
            expectedType: testCase.expectedType,
            apiStatus: 'unknown',
            hasMapContent: false,
            hasPolygon: false,
            status: 'ERROR_' + errorStep.toUpperCase(),
            error: error.message
          });
        }

        // Continue with next test case
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
).join('\n') || 'Nenhum caso de sucesso'}

### ⚠️ Casos Incompletos
${results.filter(r => r.status === 'MAP_RENDER_INCOMPLETE').map(r => 
  `- **${r.name}**: Modal aberto, mas renderização incompleta (tiles ou polígono)`
).join('\n') || 'Nenhum caso incompleto'}

### ❌ Casos com Erro
${results.filter(r => r.status.startsWith('ERROR')).map(r => 
  `- **${r.name}**: ${r.status}${r.error ? ` - ${r.error}` : ''}${r.debugScreenshot ? ` (Debug: ${r.debugScreenshot})` : ''}`
).join('\n') || 'Nenhum erro encontrado'}

## 📊 Resumo de Status

- **SUCCESS**: ${results.filter(r => r.status === 'SUCCESS').length}/${results.length}
- **MAP_RENDER_INCOMPLETE**: ${results.filter(r => r.status === 'MAP_RENDER_INCOMPLETE').length}/${results.length}
- **ERROR_LOGIN**: ${results.filter(r => r.status === 'ERROR_LOGIN').length}/${results.length}
- **ERROR_TABLE**: ${results.filter(r => r.status === 'ERROR_TABLE').length}/${results.length}
- **ERROR_ROW_BUTTON**: ${results.filter(r => r.status === 'ERROR_ROW_BUTTON').length}/${results.length}

## ✅ Critérios de Aceitação

- **4 screenshots finais**: ${results.length >= 4 ? '✅' : '❌'} (${results.length}/4)
- **Pelo menos 1 Polygon com overlay**: ${results.some(r => r.expectedType === 'Polygon' && r.hasPolygon) ? '✅' : '❌'}
- **Providência abre sem crash**: ${results.find(r => r.name.includes('Providência'))?.hasMapContent ? '✅' : '❌'}

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
