/**
 * Teste do Sistema de Cálculo de Taxa Kaviar
 * 
 * Testa os 3 cenários principais:
 * 1. Corrida no mesmo bairro (7%)
 * 2. Corrida com origem/destino no bairro do motorista (12%)
 * 3. Corrida fora da cerca virtual (20%)
 */

import { calculateTripFee } from '../services/fee-calculation';

// Coordenadas de teste (Pinheiros, São Paulo)
const PINHEIROS_CENTER = { lat: -23.5629, lng: -46.6888 };
const PINHEIROS_NEARBY = { lat: -23.5650, lng: -46.6900 };
const MOEMA_CENTER = { lat: -23.5880, lng: -46.6570 };

async function runTests() {
  console.log('🧪 TESTE DO SISTEMA DE CÁLCULO DE TAXA KAVIAR\n');
  console.log('=' .repeat(60));
  
  // Nota: Você precisa substituir 'DRIVER_ID_AQUI' por um ID real de motorista
  // que tenha Pinheiros como bairro base
  const DRIVER_ID = 'DRIVER_ID_AQUI';
  const FARE_AMOUNT = 25.00;
  
  try {
    // TESTE 1: Corrida no mesmo bairro (7%)
    console.log('\n📍 TESTE 1: Corrida completa em Pinheiros');
    console.log('-'.repeat(60));
    
    const test1 = await calculateTripFee(
      DRIVER_ID,
      PINHEIROS_CENTER.lat,
      PINHEIROS_CENTER.lng,
      PINHEIROS_NEARBY.lat,
      PINHEIROS_NEARBY.lng,
      FARE_AMOUNT
    );
    
    console.log(`Origem: Pinheiros (${PINHEIROS_CENTER.lat}, ${PINHEIROS_CENTER.lng})`);
    console.log(`Destino: Pinheiros (${PINHEIROS_NEARBY.lat}, ${PINHEIROS_NEARBY.lng})`);
    console.log(`\nValor da corrida: R$ ${FARE_AMOUNT.toFixed(2)}`);
    console.log(`Taxa: ${test1.feePercentage}% (R$ ${test1.feeAmount.toFixed(2)})`);
    console.log(`Motorista recebe: R$ ${test1.driverEarnings.toFixed(2)}`);
    console.log(`Match: ${test1.matchType}`);
    console.log(`Motivo: ${test1.reason}`);
    
    const expectedFee1 = 7;
    const passed1 = test1.feePercentage === expectedFee1;
    console.log(`\n${passed1 ? '✅' : '❌'} Esperado: ${expectedFee1}% | Obtido: ${test1.feePercentage}%`);
    
    // TESTE 2: Corrida com destino fora (12%)
    console.log('\n\n📍 TESTE 2: Origem em Pinheiros, destino em Moema');
    console.log('-'.repeat(60));
    
    const test2 = await calculateTripFee(
      DRIVER_ID,
      PINHEIROS_CENTER.lat,
      PINHEIROS_CENTER.lng,
      MOEMA_CENTER.lat,
      MOEMA_CENTER.lng,
      35.00
    );
    
    console.log(`Origem: Pinheiros (${PINHEIROS_CENTER.lat}, ${PINHEIROS_CENTER.lng})`);
    console.log(`Destino: Moema (${MOEMA_CENTER.lat}, ${MOEMA_CENTER.lng})`);
    console.log(`\nValor da corrida: R$ 35.00`);
    console.log(`Taxa: ${test2.feePercentage}% (R$ ${test2.feeAmount.toFixed(2)})`);
    console.log(`Motorista recebe: R$ ${test2.driverEarnings.toFixed(2)}`);
    console.log(`Match: ${test2.matchType}`);
    console.log(`Motivo: ${test2.reason}`);
    
    const expectedFee2 = 12;
    const passed2 = test2.feePercentage === expectedFee2;
    console.log(`\n${passed2 ? '✅' : '❌'} Esperado: ${expectedFee2}% | Obtido: ${test2.feePercentage}%`);
    
    // TESTE 3: Corrida completamente fora (20%)
    console.log('\n\n📍 TESTE 3: Corrida completa fora da cerca (Moema → Moema)');
    console.log('-'.repeat(60));
    
    const test3 = await calculateTripFee(
      DRIVER_ID,
      MOEMA_CENTER.lat,
      MOEMA_CENTER.lng,
      MOEMA_CENTER.lat + 0.01,
      MOEMA_CENTER.lng + 0.01,
      30.00
    );
    
    console.log(`Origem: Moema (${MOEMA_CENTER.lat}, ${MOEMA_CENTER.lng})`);
    console.log(`Destino: Moema (${MOEMA_CENTER.lat + 0.01}, ${MOEMA_CENTER.lng + 0.01})`);
    console.log(`\nValor da corrida: R$ 30.00`);
    console.log(`Taxa: ${test3.feePercentage}% (R$ ${test3.feeAmount.toFixed(2)})`);
    console.log(`Motorista recebe: R$ ${test3.driverEarnings.toFixed(2)}`);
    console.log(`Match: ${test3.matchType}`);
    console.log(`Motivo: ${test3.reason}`);
    
    const expectedFee3 = 20;
    const passed3 = test3.feePercentage === expectedFee3;
    console.log(`\n${passed3 ? '✅' : '❌'} Esperado: ${expectedFee3}% | Obtido: ${test3.feePercentage}%`);
    
    // RESUMO
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    
    const allPassed = passed1 && passed2 && passed3;
    console.log(`\nTeste 1 (Mesmo bairro - 7%): ${passed1 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`Teste 2 (Adjacente - 12%): ${passed2 ? '✅ PASSOU' : '❌ FALHOU'}`);
    console.log(`Teste 3 (Fora da cerca - 20%): ${passed3 ? '✅ PASSOU' : '❌ FALHOU'}`);
    
    console.log(`\n${allPassed ? '🎉 TODOS OS TESTES PASSARAM!' : '⚠️  ALGUNS TESTES FALHARAM'}\n`);
    
  } catch (error: any) {
    console.error('\n❌ ERRO AO EXECUTAR TESTES:', error.message);
    console.error('\nVerifique se:');
    console.error('1. O banco de dados está acessível');
    console.error('2. As geometrias dos bairros estão importadas');
    console.error('3. O DRIVER_ID existe e tem bairro base cadastrado');
  }
}

// Executar testes
runTests().then(() => {
  console.log('Testes concluídos.');
  process.exit(0);
}).catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
