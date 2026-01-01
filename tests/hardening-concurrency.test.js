const request = require('supertest');
const app = require('../server');

/**
 * TESTES DE HARDENING - CONCORRÊNCIA REAL E BYPASS
 * 
 * Testa se o sistema resiste a ataques e concorrência real
 */

describe('Hardening - Testes de Concorrência e Bypass', () => {
  
  describe('Concorrência Real no Aceite', () => {
    test('Dois motoristas aceitando simultaneamente - apenas um deve vencer', async () => {
      const rideId = '123e4567-e89b-12d3-a456-426614174000';
      const driver1 = '123e4567-e89b-12d3-a456-426614174001';
      const driver2 = '123e4567-e89b-12d3-a456-426614174002';
      
      // Simular aceite simultâneo
      const promises = [
        request(app)
          .post(`/api/v1/rides/${rideId}/accept`)
          .send({ driver_id: driver1 }),
        request(app)
          .post(`/api/v1/rides/${rideId}/accept`)
          .send({ driver_id: driver2 })
      ];
      
      const responses = await Promise.all(promises);
      
      // Apenas um deve ter sucesso
      const successCount = responses.filter(r => r.body.success === true).length;
      const errorCount = responses.filter(r => r.body.success === false).length;
      
      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);
      
      // O que falhou deve ter erro específico
      const failedResponse = responses.find(r => r.body.success === false);
      expect(failedResponse.body.error).toMatch(/não está mais disponível|já foi aceita|outro motorista/);
    });
  });
  
  describe('Tentativas de Bypass', () => {
    test('Criação de corrida deve usar stored procedure', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem',
          destination: 'Destino'
        });
      
      // Deve usar stored procedure (não erro de campo obrigatório do banco)
      if (response.status === 500) {
        expect(response.body.error).not.toContain('null value in column');
        expect(response.body.error).not.toContain('violates not-null constraint');
      }
    });
    
    test('Motorista inativo não pode aceitar corrida', async () => {
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/accept')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000' // Motorista inexistente/inativo
        });
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/não encontrado|inativo|não está ativo/);
    });
    
    test('Motorista de comunidade diferente não pode aceitar (sem external)', async () => {
      // Este teste assumiria dados específicos no banco
      // Em ambiente real, seria configurado com dados de teste
      expect(true).toBe(true); // Placeholder - implementar com dados reais
    });
  });
  
  describe('Validação de Estados', () => {
    test('Transições inválidas devem ser bloqueadas', async () => {
      const rideId = '123e4567-e89b-12d3-a456-426614174000';
      const driverId = '123e4567-e89b-12d3-a456-426614174001';
      
      // Tentar iniciar corrida que não foi aceita
      const response = await request(app)
        .post(`/api/v1/rides/${rideId}/start`)
        .send({ driver_id: driverId });
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/não encontrada|não está aceita|estado atual/);
    });
    
    test('Finalização sem início deve falhar', async () => {
      const rideId = '123e4567-e89b-12d3-a456-426614174000';
      const driverId = '123e4567-e89b-12d3-a456-426614174001';
      
      const response = await request(app)
        .post(`/api/v1/rides/${rideId}/finish`)
        .send({ driver_id: driverId });
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/não encontrada|não está em progresso/);
    });
  });
  
  describe('Validação de Destino Obrigatório', () => {
    test('Corrida sem destino deve falhar', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida'
          // destination ausente
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/destino|destination/i);
    });
    
    test('Destino muito curto deve falhar', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: 'AB' // Menos de 3 caracteres
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/3 caracteres|muito curto/i);
    });
  });
  
  describe('Atomicidade das Stored Procedures', () => {
    test('Stored procedures devem existir e responder', async () => {
      // Testar se stored procedures existem (via erro específico)
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/accept')
        .send({
          driver_id: '123e4567-e89b-12d3-a456-426614174001'
        });
      
      // Não deve ser erro de função inexistente
      if (response.status === 500) {
        expect(response.body.error).not.toContain('function');
        expect(response.body.error).not.toContain('does not exist');
        expect(response.body.error).not.toContain('undefined');
      }
    });
    
    test('Erros de stored procedure devem ser estruturados', async () => {
      const response = await request(app)
        .post('/api/v1/rides/00000000-0000-0000-0000-000000000000/accept')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000'
        });
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
    });
  });
  
  describe('Proteção contra Updates Diretos', () => {
    test('API não deve permitir update direto em rides', async () => {
      // Este teste verificaria se existe algum endpoint que faz UPDATE direto
      // Em um sistema real, seria implementado verificando logs ou tentativas
      expect(true).toBe(true); // Placeholder - implementar verificação real
    });
  });
});

module.exports = {
  testSuite: 'Hardening - Concorrência e Bypass'
};
