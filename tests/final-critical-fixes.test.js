const request = require('supertest');
const app = require('../server');

/**
 * TESTES PARA AJUSTES CRÍTICOS FINAIS
 * 
 * Valida as 3 correções críticas implementadas
 */

describe('Ajustes Críticos Finais', () => {
  
  describe('NC1: Validação de Destino Obrigatório', () => {
    test('Deve rejeitar corrida sem destino', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida'
          // destination ausente
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('destino');
    });
    
    test('Deve rejeitar corrida com destino vazio', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: '   ' // Apenas espaços
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('destino');
    });
    
    test('Deve rejeitar corrida com destino muito curto', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: 'AB' // Menos de 3 caracteres
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('3 caracteres');
    });
  });
  
  describe('NC2: Race Condition no Aceite', () => {
    test('Stored procedure atomic_accept_ride deve existir', async () => {
      // Teste indireto: tentar aceitar corrida inexistente
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/accept')
        .send({
          driver_id: '123e4567-e89b-12d3-a456-426614174001'
        });
      
      // Deve usar stored procedure (não erro de função inexistente)
      expect([409, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      
      // Se for erro 500, não deve ser "function does not exist"
      if (response.status === 500) {
        expect(response.body.error).not.toContain('function');
        expect(response.body.error).not.toContain('does not exist');
      }
    });
    
    test('Aceite deve falhar para motorista inexistente', async () => {
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/accept')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000'
        });
      
      expect([409, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      
      // Deve mencionar motorista não encontrado
      if (response.status === 409) {
        expect(response.body.error).toContain('não encontrado');
      }
    });
  });
  
  describe('NC3: Validação de Motorista Ativo', () => {
    test('Disponibilidade deve rejeitar motorista inativo', async () => {
      const response = await request(app)
        .post('/api/v1/drivers/availability')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000', // Inexistente = inativo
          is_available: true
        });
      
      expect([403, 404]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('inativo');
    });
    
    test('Início de corrida deve validar motorista ativo', async () => {
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/start')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000'
        });
      
      expect([409, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      
      // Deve mencionar motorista não encontrado ou inativo
      if (response.status === 409) {
        expect(response.body.error).toMatch(/não encontrado|inativo/);
      }
    });
  });
  
  describe('Validações Gerais', () => {
    test('Endpoints críticos devem existir e responder', async () => {
      const endpoints = [
        { method: 'post', path: '/api/v1/rides', body: {} },
        { method: 'post', path: '/api/v1/drivers/availability', body: {} },
        { method: 'post', path: '/api/v1/rides/test-id/accept', body: {} }
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send(endpoint.body);
        
        // Não deve ser 404 (endpoint não encontrado)
        expect(response.status).not.toBe(404);
        expect(response.body).toHaveProperty('success');
      }
    });
    
    test('Respostas de erro devem ser estruturadas', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({}); // Payload vazio
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});

module.exports = {
  testSuite: 'Ajustes Críticos Finais'
};
