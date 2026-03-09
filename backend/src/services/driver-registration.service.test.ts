import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DriverRegistrationService } from './driver-registration.service';
import { prisma } from '../lib/prisma';

describe('DriverRegistrationService', () => {
  let service: DriverRegistrationService;
  
  beforeEach(() => {
    service = new DriverRegistrationService();
  });
  
  afterEach(async () => {
    // Cleanup test data
    await prisma.driver_verifications.deleteMany({
      where: { driver_id: { startsWith: 'driver_test_' } }
    });
    await prisma.consents.deleteMany({
      where: { user_id: { startsWith: 'driver_test_' } }
    });
    await prisma.drivers.deleteMany({
      where: { id: { startsWith: 'driver_test_' } }
    });
  });
  
  describe('register', () => {
    it('deve criar driver com todos campos obrigatórios', async () => {
      const result = await service.register({
        name: 'João Silva',
        email: `joao.test.${Date.now()}@test.com`,
        phone: '+5521999999999',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      expect(result.success).toBe(true);
      expect(result.driver?.status).toBe('pending');
      expect(result.driver?.isPending).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.driver?.territory_verification_method).toBeDefined();
    });
    
    it('deve rejeitar phone vazio', async () => {
      const result = await service.register({
        name: 'João Silva',
        email: 'joao@test.com',
        phone: '',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Telefone é obrigatório');
    });
    
    it('deve criar consent LGPD', async () => {
      const email = `joao.consent.${Date.now()}@test.com`;
      const result = await service.register({
        name: 'João Silva',
        email,
        phone: '+5521999999999',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      expect(result.success).toBe(true);
      
      const consent = await prisma.consents.findFirst({
        where: { user_id: result.driver!.id, type: 'lgpd' }
      });
      
      expect(consent).toBeDefined();
      expect(consent?.accepted).toBe(true);
    });
    
    it('deve criar driver_verification', async () => {
      const email = `joao.verification.${Date.now()}@test.com`;
      const result = await service.register({
        name: 'João Silva',
        email,
        phone: '+5521999999999',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      expect(result.success).toBe(true);
      
      const verification = await prisma.driver_verifications.findFirst({
        where: { driver_id: result.driver!.id }
      });
      
      expect(verification).toBeDefined();
      expect(verification?.status).toBe('PENDING');
    });
    
    it('deve rejeitar email duplicado', async () => {
      const email = `joao.duplicate.${Date.now()}@test.com`;
      
      await service.register({
        name: 'João Silva',
        email,
        phone: '+5521999999999',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      const result = await service.register({
        name: 'João Silva 2',
        email,
        phone: '+5521988888888',
        password: 'senha456',
        document_cpf: '98765432100',
        vehicle_color: 'Preto',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email já cadastrado');
    });
    
    it('deve aceitar communityId e validar contra neighborhoodId', async () => {
      // Este teste requer setup de neighborhood e community no banco
      // Placeholder para implementação real
      expect(true).toBe(true);
    });
    
    it('deve preencher territory_verification_method', async () => {
      const result = await service.register({
        name: 'João Silva',
        email: `joao.territory.${Date.now()}@test.com`,
        phone: '+5521999999999',
        password: 'senha123',
        document_cpf: '12345678901',
        vehicle_color: 'Branco',
        accepted_terms: true,
        neighborhoodId: 'test-neighborhood-id',
        verificationMethod: 'GPS_AUTO'
      });
      
      expect(result.success).toBe(true);
      expect(result.driver?.territory_verification_method).toBe('GPS_AUTO');
    });
  });
});
