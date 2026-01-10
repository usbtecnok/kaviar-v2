#!/usr/bin/env node

/**
 * Interceptar request da tabela admin para identificar endpoint
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function interceptAdminTableRequest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requests = [];

  // Interceptar todos os requests
  page.on('request', request => {
    if (request.url().includes('communities')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });

  page.on('response', async response => {
    if (response.url().includes('communities')) {
      try {
        const responseBody = await response.text();
        requests.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          responseBody: responseBody.substring(0, 2000), // Primeiros 2000 chars
          timestamp: Date.now()
        });
      } catch (error) {
        console.log('Erro ao capturar response:', error.message);
      }
    }
  });

  try {
    // Login
    await page.goto(process.env.ADMIN_URL);
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL);
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); // Aguardar login

    // Navegar para communities (onde está a tabela)
    await page.goto(`${process.env.ADMIN_URL}/admin/communities`);
    await page.waitForTimeout(5000); // Aguardar carregamento da tabela

    console.log('🔍 REQUESTS INTERCEPTADOS:');
    console.log(JSON.stringify(requests, null, 2));

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await browser.close();
  }
}

interceptAdminTableRequest();
