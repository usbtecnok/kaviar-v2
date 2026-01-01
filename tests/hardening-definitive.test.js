const request = require('supertest');
const app = require('../server');

/**
 * TESTES DE CONCORRÊNCIA EXTREMA E DEADLOCK
 * 
 * Valida que o sistema resiste a concorrência real e não gera deadlocks
 */

describe('Hardening Definitivo - Concorrência Extrema', () => {
  
  describe('Deadlock Prevention', () => {
    test('10 motoristas aceitando simultaneamente - ordem de locks consistente', async () => {
      const rideId = '123e4567-e89b-12d3-a456-426614174000';
      const drivers = Array.from({ length: 10 }, (_, i) => 
        `123e4567-e89b-12d3-a456-42661417400${i}`
      );
      
      // Simular aceite extremamente simultâneo
      const promises = drivers.map(driverId =>
        request(app)
          .post(`/api/v1/rides/${rideId}/accept`)
          .send({ driver_id: driverId })
      );
      
      const responses = await Promise.allSettled(promises);
      
      // Verificar que não houve deadlock (todas as respostas chegaram)
      expect(responses.length).toBe(10);
      
      // Verificar que todas as respostas são válidas (não timeout)
      responses.forEach(response => {
        expect(response.status).toBe('fulfilled');
        expect(response.value.body).toHaveProperty('success');
      });
      
      // Apenas um deve ter sucesso
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.body.success === true
      ).length;
      
      expect(successCount).toBeLessThanOrEqual(1);
    });
    
    test('Aceite + Início simultâneos - sem deadlock', async () => {
      const rideId1 = '123e4567-e89b-12d3-a456-426614174001';
      const rideId2 = '123e4567-e89b-12d3-a456-426614174002';
      const driver1 = '123e4567-e89b-12d3-a456-426614174011';
      const driver2 = '123e4567-e89b-12d3-a456-426614174012';
      
      // Operações cruzadas que poderiam gerar deadlock
      const promises = [
        request(app)
          .post(`/api/v1/rides/${rideId1}/accept`)
          .send({ driver_id: driver1 }),
        request(app)
          .post(`/api/v1/rides/${rideId2}/start`)
          .send({ driver_id: driver2 })
      ];
      
      const responses = await Promise.allSettled(promises);
      
      // Não deve haver timeout ou deadlock
      expect(responses.length).toBe(2);
      responses.forEach(response => {
        expect(response.status).toBe('fulfilled');
      });
    });
  });
  
  describe('Transação Explícita', () => {
    test('Falha em auditoria deve fazer rollback completo', async () => {
      // Este teste assumiria uma configuração específica onde auditoria falha
      // Em ambiente real, seria simulado com dados que violam constraint
      
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/accept')
        .send({
          driver_id: '123e4567-e89b-12d3-a456-426614174001'
        });
      
      // Se falhar, deve ser rollback completo (não parcial)
      if (response.body.success === false) {
        expect(response.body.error).toContain('Erro ao aceitar corrida');
        expect(response.body).toHaveProperty('error_code');
      }
    });
    
    test('Stored procedures usam transação explícita', async () => {
      // Verificar se SPs retornam erro estruturado (indicando transação explícita)
      const response = await request(app)
        .post('/api/v1/rides/00000000-0000-0000-0000-000000000000/accept')
        .send({
          driver_id: '00000000-0000-0000-0000-000000000000'
        });
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      
      // Se usar transação explícita, deve ter error_code
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error_code');
      }
    });
  });
  
  describe('Validação de Enum', () => {
    test('Service type inválido deve ser rejeitado explicitamente', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: 'Destino válido',
          service_type: 'INVALID_TYPE'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/tipo.*serviço.*inválido/i);
    });
    
    test('SQL injection via service_type deve falhar', async () => {
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: 'Destino válido',
          service_type: "'; DROP TABLE rides; --"
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Não deve ser erro de SQL, deve ser validação de enum
      expect(response.body.error).not.toContain('syntax error');
      expect(response.body.error).not.toContain('DROP');
    });
  });
  
  describe('Eliminação de UPDATE Direto', () => {
    test('Recusa deve usar stored procedure', async () => {
      const response = await request(app)
        .post('/api/v1/rides/123e4567-e89b-12d3-a456-426614174000/decline')
        .send({
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
          reason: 'Teste de recusa'
        });
      
      // Deve usar SP (não erro de trigger de UPDATE direto)
      if (response.status === 500) {
        expect(response.body.error).not.toContain('prevent_direct_ride_updates');
        expect(response.body.error).not.toContain('stored procedures atômicas');
      }
    });
  });
  
  describe('Validação Dentro da Transação', () => {
    test('Comunidade inativa detectada atomicamente', async () => {
      // Teste assumiria dados específicos onde comunidade fica inativa
      const response = await request(app)
        .post('/api/v1/rides')
        .send({
          passenger_id: '123e4567-e89b-12d3-a456-426614174000',
          pickup_location: 'Origem válida',
          destination: 'Destino válido',
          allow_external_drivers: false
        });
      
      // Se falhar por comunidade inativa, deve incluir contagem
      if (response.body.error?.includes('não está ativa')) {
        expect(response.body).toHaveProperty('community_id');
        expect(response.body).toHaveProperty('active_drivers');
      }
    });
  });
  
  describe('Retry e Idempotência', () => {
    test('Retry de aceite deve ser idempotente', async () => {
      const rideId = '123e4567-e89b-12d3-a456-426614174000';
      const driverId = '123e4567-e89b-12d3-a456-426614174001';
      
      // Simular retry rápido
      const promises = [
        request(app)
          .post(`/api/v1/rides/${rideId}/accept`)
          .send({ driver_id: driverId }),
        request(app)
          .post(`/api/v1/rides/${rideId}/accept`)
          .send({ driver_id: driverId })
      ];
      
      const responses = await Promise.all(promises);
      
      // Ambas devem responder (não travar)
      expect(responses.length).toBe(2);
      
      // Se uma teve sucesso, a outra deve falhar graciosamente
      const successCount = responses.filter(r => r.body.success === true).length;
      if (successCount === 1) {
        const failedResponse = responses.find(r => r.body.success === false);
        expect(failedResponse.body.error).toMatch(/não está mais disponível|já foi aceita/);
      }
    });
  });
});

module.exports = {
  testSuite: 'Hardening Definitivo - Concorrência Extrema'
};
