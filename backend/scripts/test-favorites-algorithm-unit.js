#!/usr/bin/env node

/**
 * Test: Favorites Matching Algorithm (Unit Tests)
 * Tests core algorithm logic without database dependencies
 */

console.log('🧪 FAVORITES MATCHING ALGORITHM - UNIT TESTS\n');
console.log('='.repeat(50) + '\n');

// Mock distance calculation (Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Test 1: Distance calculation
function testDistanceCalculation() {
  console.log('📍 TEST 1: Distance Calculation');
  
  const paulista = { lat: -23.5505, lng: -46.6333 };
  const nearby = { lat: -23.5515, lng: -46.6343 };
  
  const distance = calculateDistance(paulista.lat, paulista.lng, nearby.lat, nearby.lng);
  const pass = distance > 100 && distance < 200; // Should be ~150m
  
  console.log(`  Distance: ${Math.round(distance)}m`);
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}: Distance calculation working\n`);
  return pass;
}

// Test 2: Anchor detection logic
function testAnchorDetection() {
  console.log('📍 TEST 2: Anchor Detection Logic');
  
  const ANCHOR_DETECT_METERS = 400;
  const pickup = { lat: -23.5510, lng: -46.6338 };
  const favorites = [
    { id: '1', lat: -23.5505, lng: -46.6333, label: 'Casa', type: 'HOME' },
    { id: '2', lat: -23.6000, lng: -46.7000, label: 'Trabalho', type: 'WORK' }
  ];
  
  let anchor = null;
  let minDistance = Infinity;
  
  for (const fav of favorites) {
    const distance = calculateDistance(pickup.lat, pickup.lng, fav.lat, fav.lng);
    if (distance <= ANCHOR_DETECT_METERS && distance < minDistance) {
      minDistance = distance;
      anchor = fav;
    }
  }
  
  const pass = anchor && anchor.type === 'HOME';
  console.log(`  Anchor detected: ${anchor ? anchor.label : 'none'}`);
  console.log(`  Distance: ${Math.round(minDistance)}m`);
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}: HOME favorite detected as anchor\n`);
  return pass;
}

// Test 3: Score calculation
function testScoreCalculation() {
  console.log('📍 TEST 3: Score Calculation');
  
  const anchor = { lat: -23.5505, lng: -46.6333 };
  const pickup = { lat: -23.5510, lng: -46.6338 };
  
  const driverNear = { lat: -23.5515, lng: -46.6343 }; // 300m from anchor
  const driverFar = { lat: -23.5805, lng: -46.6633 }; // 3km from anchor
  
  function calculateScore(driverBase, anchor, pickup) {
    let score = 0;
    
    const pickupDistance = calculateDistance(pickup.lat, pickup.lng, driverBase.lat, driverBase.lng);
    if (pickupDistance <= 1000) score += 0;
    else if (pickupDistance <= 3000) score += 2;
    else score += 5;
    
    const anchorDistance = calculateDistance(anchor.lat, anchor.lng, driverBase.lat, driverBase.lng);
    if (anchorDistance <= 800) score += 0;
    else if (anchorDistance <= 2000) score += 5;
    else score += 15;
    
    return score;
  }
  
  const scoreNear = calculateScore(driverNear, anchor, pickup);
  const scoreFar = calculateScore(driverFar, anchor, pickup);
  
  const pass = scoreNear < scoreFar;
  console.log(`  Driver near anchor: score=${scoreNear}`);
  console.log(`  Driver far from anchor: score=${scoreFar}`);
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}: Near driver has better score\n`);
  return pass;
}

// Test 4: Secondary base priority
function testSecondaryBasePriority() {
  console.log('📍 TEST 4: Secondary Base Priority');
  
  const anchor = { lat: -23.5505, lng: -46.6333 };
  
  const driver = {
    last_lat: -23.5805, // Far from anchor
    last_lng: -46.6633,
    secondary_base_lat: -23.5510, // Near anchor
    secondary_base_lng: -46.6338,
    secondary_base_enabled: true
  };
  
  // Get best base (closest to anchor)
  const bases = [
    { coord: { lat: driver.last_lat, lng: driver.last_lng }, priority: 1 },
    { coord: { lat: driver.secondary_base_lat, lng: driver.secondary_base_lng }, priority: 2 }
  ];
  
  let closestBase = bases[0].coord;
  let minDistance = calculateDistance(anchor.lat, anchor.lng, closestBase.lat, closestBase.lng);
  
  for (let i = 1; i < bases.length; i++) {
    const distance = calculateDistance(anchor.lat, anchor.lng, bases[i].coord.lat, bases[i].coord.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestBase = bases[i].coord;
    }
  }
  
  const pass = closestBase.lat === driver.secondary_base_lat;
  console.log(`  Selected base: ${pass ? 'secondary' : 'primary'}`);
  console.log(`  Distance to anchor: ${Math.round(minDistance)}m`);
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}: Secondary base selected (closer to anchor)\n`);
  return pass;
}

// Run all tests
const results = [];
results.push(testDistanceCalculation());
results.push(testAnchorDetection());
results.push(testScoreCalculation());
results.push(testSecondaryBasePriority());

console.log('='.repeat(50));
console.log('\n📊 RESULTS\n');
console.log(`Total: ${results.length}`);
console.log(`Passed: ${results.filter(r => r).length}`);
console.log(`Failed: ${results.filter(r => !r).length}`);

const allPassed = results.every(r => r);
console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

process.exit(allPassed ? 0 : 1);
