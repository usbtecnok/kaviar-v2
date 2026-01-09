#!/usr/bin/env node

/**
 * KAVIAR - API Validation Before UI Capture
 * Validates geofence APIs are responding correctly before screenshot capture
 */

import { config } from 'dotenv';

config();

const TEST_CASES = [
  { name: 'Botafogo', id: 'cmk6ux02j0011qqr398od1msm', expected: 'Polygon' },
  { name: 'Tijuca', id: 'cmk6ux8fk001rqqr371kc4ple', expected: 'Polygon' },
  { name: 'Glória', id: 'cmk6uwq9u0007qqr3pxqr64ce', expected: 'Polygon' },
  { name: 'Morro da Providência', id: 'cmk6uwnvh0001qqr377ziza29', expected: 'SEM_DADOS' }
];

async function validateAPIs() {
  console.log('🔍 KAVIAR - API Validation Before UI Capture');
  console.log('=============================================');
  
  const { API_URL = 'https://kaviar-v2.onrender.com' } = process.env;
  
  console.log(`📡 Testing API: ${API_URL}`);
  console.log('');
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    try {
      const url = `${API_URL}/api/governance/communities/${testCase.id}/geofence`;
      const response = await fetch(url);
      
      let geometryType = 'SEM_DADOS';
      let status = response.status;
      
      if (response.ok) {
        const data = await response.json();
        geometryType = data.data?.geometry?.type || 'SEM_DADOS';
      }
      
      const isExpected = geometryType === testCase.expected;
      const statusIcon = isExpected ? '✅' : '⚠️';
      
      console.log(`${statusIcon} ${testCase.name}: HTTP ${status} → ${geometryType} (expected: ${testCase.expected})`);
      
      results.push({
        name: testCase.name,
        id: testCase.id,
        expected: testCase.expected,
        actual: geometryType,
        status,
        isExpected
      });
      
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
      results.push({
        name: testCase.name,
        id: testCase.id,
        expected: testCase.expected,
        actual: 'ERROR',
        status: 0,
        isExpected: false,
        error: error.message
      });
    }
  }
  
  console.log('');
  console.log('📊 Summary:');
  const conforming = results.filter(r => r.isExpected).length;
  const total = results.length;
  console.log(`✅ Conforming: ${conforming}/${total} (${Math.round(conforming/total*100)}%)`);
  
  if (conforming === total) {
    console.log('🎯 All APIs responding as expected - ready for UI capture!');
  } else {
    console.log('⚠️ Some APIs have divergences - documented in previous audit');
  }
  
  return results;
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateAPIs().catch(console.error);
}

export { validateAPIs };
