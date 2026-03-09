#!/usr/bin/env tsx
/**
 * Script de validação da implementação de unificação do onboarding
 * Executa testes manuais das funcionalidades críticas
 */

import { driverRegistrationService } from '../src/services/driver-registration.service';
import { prisma } from '../src/lib/prisma';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: (error as Error).message });
    console.log(`❌ ${name}: ${(error as Error).message}`);
  }
}

async function runTests() {
  console.log('🧪 Iniciando testes de validação...\n');

  // Teste 1: Phone não pode ser vazio
  await test('Rejeitar phone vazio', async () => {
    const result = await driverRegistrationService.register({
      name: 'Test User',
      email: 'test@test.com',
      phone: '',
      password: 'senha123',
      document_cpf: '12345678901',
      vehicle_color: 'Branco',
      accepted_terms: true,
      neighborhoodId: 'test-id'
    });
    
    if (result.success) {
      throw new Error('Deveria ter rejeitado phone vazio');
    }
    if (!result.error?.includes('Telefone é obrigatório')) {
      throw new Error(`Erro incorreto: ${result.error}`);
    }
  });

  // Teste 2: Phone com apenas espaços
  await test('Rejeitar phone com apenas espaços', async () => {
    const result = await driverRegistrationService.register({
      name: 'Test User',
      email: 'test@test.com',
      phone: '   ',
      password: 'senha123',
      document_cpf: '12345678901',
      vehicle_color: 'Branco',
      accepted_terms: true,
      neighborhoodId: 'test-id'
    });
    
    if (result.success) {
      throw new Error('Deveria ter rejeitado phone com espaços');
    }
  });

  // Teste 3: Validar que communityId usa slug, não name
  await test('validateCommunity usa id ou slug', async () => {
    // Verificar que o método existe e tem a assinatura correta
    const service = driverRegistrationService as any;
    if (typeof service.validateCommunity !== 'function') {
      throw new Error('Método validateCommunity não encontrado');
    }
    
    // Verificar código fonte
    const code = service.validateCommunity.toString();
    if (code.includes('name:')) {
      throw new Error('validateCommunity ainda usa "name" em vez de "slug"');
    }
    if (!code.includes('slug:')) {
      throw new Error('validateCommunity não usa "slug"');
    }
  });

  // Teste 4: checkPointInGeofence não é placeholder
  await test('checkPointInGeofence implementado', async () => {
    const service = driverRegistrationService as any;
    if (typeof service.checkPointInGeofence !== 'function') {
      throw new Error('Método checkPointInGeofence não encontrado');
    }
    
    const code = service.checkPointInGeofence.toString();
    if (code.includes('return true') && code.includes('Placeholder')) {
      throw new Error('checkPointInGeofence ainda é placeholder');
    }
    if (!code.includes('pointInPolygon')) {
      throw new Error('checkPointInGeofence não chama pointInPolygon');
    }
  });

  // Teste 5: DriverRegistrationResult tem territory_verification_method
  await test('DriverRegistrationResult inclui territory_verification_method', async () => {
    // Criar um driver de teste
    const email = `test.${Date.now()}@validation.com`;
    
    // Buscar um neighborhood real do banco
    const neighborhood = await prisma.neighborhoods.findFirst({
      where: { is_active: true }
    });
    
    if (!neighborhood) {
      console.log('⚠️  Pulando teste: nenhum neighborhood ativo no banco');
      return;
    }
    
    const result = await driverRegistrationService.register({
      name: 'Test Verification Method',
      email,
      phone: '+5521999999999',
      password: 'senha123',
      document_cpf: '12345678901',
      vehicle_color: 'Branco',
      accepted_terms: true,
      neighborhoodId: neighborhood.id,
      verificationMethod: 'GPS_AUTO'
    });
    
    if (!result.success) {
      throw new Error(`Falha ao criar driver: ${result.error}`);
    }
    
    if (!result.driver?.territory_verification_method) {
      throw new Error('territory_verification_method não está presente no resultado');
    }
    
    if (result.driver.territory_verification_method !== 'GPS_AUTO') {
      throw new Error(`territory_verification_method incorreto: ${result.driver.territory_verification_method}`);
    }
    
    // Cleanup
    await prisma.driver_verifications.deleteMany({ where: { driver_id: result.driver.id } });
    await prisma.consents.deleteMany({ where: { user_id: result.driver.id } });
    await prisma.drivers.delete({ where: { id: result.driver.id } });
  });

  // Teste 6: Validar criação de consent
  await test('Criar consent LGPD', async () => {
    const email = `test.consent.${Date.now()}@validation.com`;
    
    const neighborhood = await prisma.neighborhoods.findFirst({
      where: { is_active: true }
    });
    
    if (!neighborhood) {
      console.log('⚠️  Pulando teste: nenhum neighborhood ativo no banco');
      return;
    }
    
    const result = await driverRegistrationService.register({
      name: 'Test Consent',
      email,
      phone: '+5521999999999',
      password: 'senha123',
      document_cpf: '12345678901',
      vehicle_color: 'Branco',
      accepted_terms: true,
      neighborhoodId: neighborhood.id
    });
    
    if (!result.success) {
      throw new Error(`Falha ao criar driver: ${result.error}`);
    }
    
    const consent = await prisma.consents.findFirst({
      where: { user_id: result.driver!.id, type: 'lgpd' }
    });
    
    if (!consent) {
      throw new Error('Consent LGPD não foi criado');
    }
    
    if (!consent.accepted) {
      throw new Error('Consent não está marcado como aceito');
    }
    
    // Cleanup
    await prisma.driver_verifications.deleteMany({ where: { driver_id: result.driver!.id } });
    await prisma.consents.deleteMany({ where: { user_id: result.driver!.id } });
    await prisma.drivers.delete({ where: { id: result.driver!.id } });
  });

  // Teste 7: Validar criação de driver_verification
  await test('Criar driver_verification', async () => {
    const email = `test.verification.${Date.now()}@validation.com`;
    
    const neighborhood = await prisma.neighborhoods.findFirst({
      where: { is_active: true }
    });
    
    if (!neighborhood) {
      console.log('⚠️  Pulando teste: nenhum neighborhood ativo no banco');
      return;
    }
    
    const result = await driverRegistrationService.register({
      name: 'Test Verification',
      email,
      phone: '+5521999999999',
      password: 'senha123',
      document_cpf: '12345678901',
      vehicle_color: 'Branco',
      accepted_terms: true,
      neighborhoodId: neighborhood.id
    });
    
    if (!result.success) {
      throw new Error(`Falha ao criar driver: ${result.error}`);
    }
    
    const verification = await prisma.driver_verifications.findFirst({
      where: { driver_id: result.driver!.id }
    });
    
    if (!verification) {
      throw new Error('driver_verification não foi criado');
    }
    
    if (verification.status !== 'PENDING') {
      throw new Error(`Status incorreto: ${verification.status}`);
    }
    
    // Cleanup
    await prisma.driver_verifications.deleteMany({ where: { driver_id: result.driver!.id } });
    await prisma.consents.deleteMany({ where: { user_id: result.driver!.id } });
    await prisma.drivers.delete({ where: { id: result.driver!.id } });
  });

  // Resumo
  console.log('\n📊 Resumo dos Testes:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passou: ${passed}`);
  console.log(`❌ Falhou: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Testes falharam:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
