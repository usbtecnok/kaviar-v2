#!/usr/bin/env node

/**
 * Capturar token admin e fazer request autenticado
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function getAdminToken() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto(process.env.ADMIN_URL);
    await page.fill('input[type="email"]', process.env.ADMIN_EMAIL);
    await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Capturar token do localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('kaviar_admin_token');
    });

    console.log('TOKEN:', token);

    // Fazer request autenticado
    const response = await fetch('https://kaviar-v2.onrender.com/api/admin/communities', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    // Filtrar Botafogo, Tijuca, Glória
    const filtered = data.data?.filter(c => 
      c.name.match(/Botafogo|Tijuca|Glória/)
    ) || [];

    console.log('ADMIN COMMUNITIES (filtered):');
    filtered.forEach(c => {
      console.log(`${c.name} -> ${c.id} -> ${c.description || 'null'}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await browser.close();
  }
}

getAdminToken();
