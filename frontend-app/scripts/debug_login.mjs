#!/usr/bin/env node

/**
 * KAVIAR - Debug Login Page
 * Test login page structure and selectors
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function debugLogin() {
  console.log('🔍 KAVIAR - Debug Login Page');
  console.log('============================');
  
  const { ADMIN_URL } = process.env;
  
  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log(`🌐 Navigating to: ${ADMIN_URL}/admin/login`);
    await page.goto(`${ADMIN_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: '/home/goes/kaviar/audit/ui_map_evidence/DEBUG_login_page.png', fullPage: true });
    console.log('📸 Login page screenshot saved');
    
    // Get all input elements
    const inputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }))
    );
    
    console.log('📋 Input elements found:');
    inputs.forEach((input, i) => {
      console.log(`  ${i+1}. Type: ${input.type}, Name: ${input.name}, ID: ${input.id}, Placeholder: ${input.placeholder}`);
    });
    
    // Get all buttons
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(button => ({
        type: button.type,
        textContent: button.textContent?.trim(),
        className: button.className
      }))
    );
    
    console.log('🔘 Button elements found:');
    buttons.forEach((button, i) => {
      console.log(`  ${i+1}. Type: ${button.type}, Text: ${button.textContent}`);
    });
    
    await page.waitForTimeout(5000); // Keep browser open for inspection
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugLogin().catch(console.error);
