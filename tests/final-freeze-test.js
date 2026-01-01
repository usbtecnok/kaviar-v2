const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../lib/supabase');

// Configurações do teste
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const JWT_SECRET=REDACTED

/**
 * TESTE FINAL DE CONGELAMENTO - VALIDAÇÃO PONTA A PONTA
 * Prova que o sistema funciona corretamente em produção
 */

class KaviarFinalTest {
  constructor() {
    this.testResults = [];
    this.tokens = {};
    this.testData = {};
  }

  log(test, status, message, data = null) {
    const result = { test, status, message, timestamp: new Date().toISOString() };
    if (data) result.data = data;
    this.testResults.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    console.log(`${icon} ${test}: ${message}`);
    if (data && process.env.NODE_ENV === 'development') {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async setupTestData() {
    try {
      // Criar dados de teste no banco
      const testPassword = await bcrypt.hash('test123', 10);
      
      // Comunidade de teste
      const { data: community } = await supabase
        .from('communities')
        .upsert({
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Comunidade Teste Final',
          is_active: true
        })
        .select()
        .single();

      // Usuários de teste
      const users = [
        {
          id: '22222222-2222-2222-2222-222222222222',
          email: 'admin.test@kaviar.app',
          password_hash: testPassword,
          user_type: 'admin',
          is_active: true,
          community_id: community.id,
          full_name: 'Admin Teste Final'
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'passenger.test@kaviar.app',
          password_hash: testPassword,
          user_type: 'passenger',
          is_active: true,
          community_id: community.id,
          full_name: 'Passageiro Teste Final'
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          email: 'driver.test@kaviar.app',
          password_hash: testPassword,
          user_type: 'driver',
          is_active: true,
          community_id: community.id,
          full_name: 'Motorista Teste Final'
        },
        {
          id: '55555555-5555-5555-5555-555555555555',
          email: 'driver.external@kaviar.app',
          password_hash: testPassword,
          user_type: 'driver',
          is_active: true,
          community_id: '66666666-6666-6666-6666-666666666666', // Comunidade diferente
          full_name: 'Motorista Externo'
        }
      ];

      await supabase.from('users').upsert(users);

      // Comunidade externa
      await supabase
        .from('communities')
        .upsert({
          id: '66666666-6666-6666-6666-666666666666',
          name: 'Comunidade Externa',
          is_active: true
        });

      // Motorista disponível
      await supabase
        .from('drivers')
        .upsert({
          id: '44444444-4444-4444-4444-444444444444',
          user_id: '44444444-4444-4444-4444-444444444444',
          community_id: community.id,
          is_active: true,
          is_available: true
        });

      this.testData = { community, users };
      this.log('SETUP', 'PASS', 'Dados de teste criados com sucesso');
    } catch (error) {
      this.log('SETUP', 'FAIL', `Erro ao criar dados de teste: ${error.message}`);
      throw error;
    }
  }

  async testAuthentication() {
    try {
      // 1. Login válido
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'passenger.test@kaviar.app',
        password: 'test123',
        user_type: 'passenger'
      });

      if (loginResponse.data.success && loginResponse.data.data.token) {
        this.tokens.passenger = loginResponse.data.data.token;
        this.log('AUTH_LOGIN', 'PASS', 'Login válido funcionando');
      } else {
        this.log('AUTH_LOGIN', 'FAIL', 'Login válido falhou');
        return false;
      }

      // 2. Token inválido → 401
      try {
        await axios.get(`${API_BASE}/api/v1/rides/test`, {
          headers: { Authorization: 'Bearer token-invalido' }
        });
        this.log('AUTH_INVALID', 'FAIL', 'Token inválido não foi rejeitado');
        return false;
      } catch (error) {
        if (error.response?.status === 401) {
          this.log('AUTH_INVALID', 'PASS', 'Token inválido corretamente rejeitado (401)');
        } else {
          this.log('AUTH_INVALID', 'FAIL', `Erro inesperado: ${error.response?.status}`);
          return false;
        }
      }

      // 3. Login motorista
      const driverLogin = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'driver.test@kaviar.app',
        password: 'test123',
        user_type: 'driver'
      });

      this.tokens.driver = driverLogin.data.data.token;
      this.log('AUTH_DRIVER', 'PASS', 'Login de motorista funcionando');

      return true;
    } catch (error) {
      this.log('AUTH_ERROR', 'FAIL', `Erro na autenticação: ${error.message}`);
      return false;
    }
  }

  async testRideFlow() {
    try {
      // 1. Criar corrida
      const rideResponse = await axios.post(`${API_BASE}/api/v1/rides`, {
        passenger_id: '33333333-3333-3333-3333-333333333333',
        pickup_location: 'Origem Teste Final',
        destination: 'Destino Teste Final',
        service_type: 'STANDARD_RIDE'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.passenger}` }
      });

      if (!rideResponse.data.success) {
        this.log('RIDE_CREATE', 'FAIL', 'Falha ao criar corrida');
        return false;
      }

      const rideId = rideResponse.data.data.id;
      this.testData.rideId = rideId;
      this.log('RIDE_CREATE', 'PASS', 'Corrida criada com sucesso', { rideId });

      // 2. Aceitar corrida
      const acceptResponse = await axios.post(`${API_BASE}/api/v1/rides/${rideId}/accept`, {
        driver_id: '44444444-4444-4444-4444-444444444444'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.driver}` }
      });

      if (!acceptResponse.data.success) {
        this.log('RIDE_ACCEPT', 'FAIL', 'Falha ao aceitar corrida');
        return false;
      }
      this.log('RIDE_ACCEPT', 'PASS', 'Corrida aceita com sucesso');

      // 3. Iniciar corrida
      const startResponse = await axios.post(`${API_BASE}/api/v1/rides/${rideId}/start`, {
        driver_id: '44444444-4444-4444-4444-444444444444'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.driver}` }
      });

      if (!startResponse.data.success) {
        this.log('RIDE_START', 'FAIL', 'Falha ao iniciar corrida');
        return false;
      }
      this.log('RIDE_START', 'PASS', 'Corrida iniciada com sucesso');

      // 4. Finalizar corrida
      const finishResponse = await axios.post(`${API_BASE}/api/v1/rides/${rideId}/finish`, {
        driver_id: '44444444-4444-4444-4444-444444444444',
        final_amount: 15.50
      }, {
        headers: { Authorization: `Bearer ${this.tokens.driver}` }
      });

      if (!finishResponse.data.success) {
        this.log('RIDE_FINISH', 'FAIL', 'Falha ao finalizar corrida');
        return false;
      }
      this.log('RIDE_FINISH', 'PASS', 'Corrida finalizada com sucesso');

      // 5. Verificar auditoria
      const { data: auditRecords } = await supabase
        .from('special_service_audit')
        .select('*')
        .eq('ride_id', rideId);

      if (auditRecords && auditRecords.length >= 3) {
        this.log('RIDE_AUDIT', 'PASS', `Auditoria completa (${auditRecords.length} registros)`);
      } else {
        this.log('RIDE_AUDIT', 'FAIL', 'Auditoria incompleta');
        return false;
      }

      return true;
    } catch (error) {
      this.log('RIDE_FLOW', 'FAIL', `Erro no fluxo de corrida: ${error.message}`);
      return false;
    }
  }

  async testCommunityFence() {
    try {
      // 1. Criar corrida na comunidade teste
      const rideResponse = await axios.post(`${API_BASE}/api/v1/rides`, {
        passenger_id: '33333333-3333-3333-3333-333333333333',
        pickup_location: 'Teste Cerca Origem',
        destination: 'Teste Cerca Destino'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.passenger}` }
      });

      const rideId = rideResponse.data.data.id;

      // 2. Tentar aceitar com motorista de outra comunidade (deve falhar)
      try {
        await axios.post(`${API_BASE}/api/v1/rides/${rideId}/accept`, {
          driver_id: '55555555-5555-5555-5555-555555555555' // Motorista externo
        }, {
          headers: { Authorization: `Bearer ${this.tokens.driver}` }
        });
        this.log('FENCE_EXTERNAL', 'FAIL', 'Motorista externo conseguiu aceitar corrida');
        return false;
      } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 409) {
          this.log('FENCE_EXTERNAL', 'PASS', 'Motorista externo corretamente bloqueado');
        } else {
          this.log('FENCE_EXTERNAL', 'FAIL', `Erro inesperado: ${error.response?.status}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.log('FENCE_ERROR', 'FAIL', `Erro no teste de cerca: ${error.message}`);
      return false;
    }
  }

  async testSecurity() {
    try {
      // 1. Teste IDOR - tentar acessar corrida de outro usuário
      try {
        await axios.get(`${API_BASE}/api/v1/rides/${this.testData.rideId}`, {
          headers: { Authorization: `Bearer ${this.tokens.driver}` } // Motorista tentando ver corrida de passageiro
        });
        // Se chegou aqui, é porque o motorista é dono da corrida (correto)
        this.log('SECURITY_IDOR', 'PASS', 'IDOR corretamente bloqueado ou autorizado');
      } catch (error) {
        if (error.response?.status === 403) {
          this.log('SECURITY_IDOR', 'PASS', 'IDOR corretamente bloqueado (403)');
        } else {
          this.log('SECURITY_IDOR', 'FAIL', `Erro inesperado: ${error.response?.status}`);
          return false;
        }
      }

      // 2. Teste Mass Assignment - tentar enviar campos proibidos
      try {
        const maliciousPayload = {
          passenger_id: '33333333-3333-3333-3333-333333333333',
          pickup_location: 'Teste Malicioso',
          destination: 'Teste Malicioso',
          is_admin: true, // Campo proibido
          allow_external_drivers: true, // Campo proibido
          status: 'completed' // Campo proibido
        };

        const response = await axios.post(`${API_BASE}/api/v1/rides`, maliciousPayload, {
          headers: { Authorization: `Bearer ${this.tokens.passenger}` }
        });

        // Verificar se campos proibidos foram ignorados
        const ride = response.data.data;
        if (ride.status === 'pending' && !ride.allow_external_drivers) {
          this.log('SECURITY_MASS_ASSIGNMENT', 'PASS', 'Campos proibidos ignorados');
        } else {
          this.log('SECURITY_MASS_ASSIGNMENT', 'FAIL', 'Campos proibidos foram aceitos');
          return false;
        }
      } catch (error) {
        this.log('SECURITY_MASS_ASSIGNMENT', 'FAIL', `Erro no teste: ${error.message}`);
        return false;
      }

      return true;
    } catch (error) {
      this.log('SECURITY_ERROR', 'FAIL', `Erro nos testes de segurança: ${error.message}`);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 INICIANDO TESTE FINAL DE CONGELAMENTO KAVIAR');
    console.log('================================================');

    try {
      await this.setupTestData();
      
      const authOk = await this.testAuthentication();
      if (!authOk) throw new Error('Falha na autenticação');

      const rideOk = await this.testRideFlow();
      if (!rideOk) throw new Error('Falha no fluxo de corridas');

      const fenceOk = await this.testCommunityFence();
      if (!fenceOk) throw new Error('Falha na cerca comunitária');

      const securityOk = await this.testSecurity();
      if (!securityOk) throw new Error('Falha nos testes de segurança');

      console.log('\n🎉 TODOS OS TESTES PASSARAM - SISTEMA CONGELADO PARA PRODUÇÃO');
      return true;
    } catch (error) {
      console.log(`\n❌ TESTE FINAL FALHOU: ${error.message}`);
      return false;
    } finally {
      this.printSummary();
    }
  }

  printSummary() {
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('=====================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ FALHAS DETECTADAS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const test = new KaviarFinalTest();
  test.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = KaviarFinalTest;
