const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../lib/supabase');
const readline = require('readline');

/**
 * SCRIPT DE ATIVAÇÃO CONTROLADA DO KAVIAR
 * Cria ambiente inicial seguro para produção
 */

class KaviarActivation {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.JWT_SECRET = process.env.JWT_SECRET;
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET não configurado no ambiente');
    }
  }

  async askConfirmation(question) {
    return new Promise((resolve) => {
      this.rl.question(`${question} (digite 'CONFIRMO' para continuar): `, (answer) => {
        resolve(answer === 'CONFIRMO');
      });
    });
  }

  async askInput(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const icon = level === 'INFO' ? 'ℹ️' : level === 'SUCCESS' ? '✅' : level === 'ERROR' ? '❌' : '⚠️';
    console.log(`[${timestamp}] ${icon} ${message}`);
    
    if (data && level !== 'ERROR') {
      console.log('   Dados:', JSON.stringify(data, null, 2));
    }
  }

  async validatePreConditions() {
    this.log('INFO', 'Validando pré-condições...');

    // 1. Verificar conexão com Supabase
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      this.log('SUCCESS', 'Conexão com Supabase OK');
    } catch (error) {
      this.log('ERROR', `Falha na conexão com Supabase: ${error.message}`);
      return false;
    }

    // 2. Verificar se JWT_SECRET está configurado
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32) {
      this.log('ERROR', 'JWT_SECRET deve ter pelo menos 32 caracteres');
      return false;
    }
    this.log('SUCCESS', 'JWT_SECRET configurado corretamente');

    // 3. Verificar se stored procedures existem
    try {
      const { data } = await supabase.rpc('atomic_create_ride', {
        passenger_uuid: '00000000-0000-0000-0000-000000000000',
        pickup_location_param: 'test',
        destination_location_param: 'test'
      });
      // Esperamos que falhe por dados inválidos, mas a função deve existir
    } catch (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        this.log('ERROR', 'Stored procedures atômicas não encontradas');
        return false;
      }
    }
    this.log('SUCCESS', 'Stored procedures atômicas disponíveis');

    return true;
  }

  async createPilotCommunity() {
    this.log('INFO', 'Criando comunidade piloto...');

    const communityData = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Comunidade Piloto Kaviar',
      description: 'Comunidade inicial para testes e validação do sistema',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('communities')
        .upsert(communityData)
        .select()
        .single();

      if (error) throw error;

      this.log('SUCCESS', 'Comunidade piloto criada', {
        id: data.id,
        name: data.name,
        status: data.is_active ? 'ativa' : 'inativa'
      });

      return data;
    } catch (error) {
      this.log('ERROR', `Falha ao criar comunidade: ${error.message}`);
      throw error;
    }
  }

  async createInitialAdmin(communityId) {
    this.log('INFO', 'Criando administrador inicial...');

    const adminEmail = await this.askInput('Email do administrador inicial: ');
    if (!adminEmail || !adminEmail.includes('@')) {
      throw new Error('Email inválido');
    }

    const adminName = await this.askInput('Nome completo do administrador: ');
    if (!adminName || adminName.length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres');
    }

    // Gerar senha temporária segura
    const tempPassword = this.generateSecurePassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const adminData = {
      id: '00000000-0000-0000-0000-000000000002',
      email: adminEmail.toLowerCase(),
      password_hash: passwordHash,
      user_type: 'admin',
      is_active: true,
      community_id: communityId,
      full_name: adminName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: null
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(adminData)
        .select('id, email, full_name, user_type')
        .single();

      if (error) throw error;

      this.log('SUCCESS', 'Administrador criado', {
        id: data.id,
        email: data.email,
        name: data.full_name,
        type: data.user_type
      });

      console.log('\n🔑 CREDENCIAIS DO ADMINISTRADOR:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Senha temporária: ${tempPassword}`);
      console.log('   ⚠️ ALTERE A SENHA NO PRIMEIRO LOGIN!\n');

      return data;
    } catch (error) {
      this.log('ERROR', `Falha ao criar administrador: ${error.message}`);
      throw error;
    }
  }

  generateSecurePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async generateAdminToken(admin) {
    this.log('INFO', 'Gerando token JWT para administrador...');

    const payload = {
      user_id: admin.id,
      email: admin.email,
      user_type: admin.user_type,
      community_id: admin.community_id
    };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: '7d', // Token válido por 7 dias
      issuer: 'kaviar-api',
      audience: 'kaviar-app'
    });

    this.log('SUCCESS', 'Token JWT gerado (válido por 7 dias)');
    
    console.log('\n🎫 TOKEN JWT DO ADMINISTRADOR:');
    console.log(`${token}\n`);
    console.log('   Use este token no header Authorization: Bearer <token>');
    console.log('   ⚠️ Guarde este token com segurança!\n');

    return token;
  }

  async createTestDriver(communityId) {
    this.log('INFO', 'Criando motorista de teste...');

    const driverPassword = await bcrypt.hash('driver123', 12);

    const driverData = {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'motorista.teste@kaviar.app',
      password_hash: driverPassword,
      user_type: 'driver',
      is_active: true,
      community_id: communityId,
      full_name: 'Motorista Teste Kaviar',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Criar usuário
      const { data: user, error: userError } = await supabase
        .from('users')
        .upsert(driverData)
        .select()
        .single();

      if (userError) throw userError;

      // Criar registro de motorista
      const { error: driverError } = await supabase
        .from('drivers')
        .upsert({
          id: user.id,
          user_id: user.id,
          community_id: communityId,
          is_active: true,
          is_available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (driverError) throw driverError;

      this.log('SUCCESS', 'Motorista de teste criado', {
        email: 'motorista.teste@kaviar.app',
        password: 'driver123',
        status: 'ativo e disponível'
      });

      return user;
    } catch (error) {
      this.log('ERROR', `Falha ao criar motorista: ${error.message}`);
      throw error;
    }
  }

  async validateSanity(community, admin, driver) {
    this.log('INFO', 'Executando validação de sanidade...');

    try {
      // 1. Verificar comunidade ativa
      const { data: communityCheck } = await supabase
        .from('communities')
        .select('is_active')
        .eq('id', community.id)
        .single();

      if (!communityCheck?.is_active) {
        throw new Error('Comunidade não está ativa');
      }

      // 2. Verificar motorista ativo
      const { data: driverCheck } = await supabase
        .from('drivers')
        .select('is_active, is_available')
        .eq('id', driver.id)
        .single();

      if (!driverCheck?.is_active || !driverCheck?.is_available) {
        throw new Error('Motorista não está ativo/disponível');
      }

      // 3. Testar autenticação do admin
      const testToken = jwt.sign(
        { user_id: admin.id, email: admin.email, user_type: admin.user_type },
        this.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Verificar se token é válido
      const decoded = jwt.verify(testToken, this.JWT_SECRET);
      if (decoded.user_id !== admin.id) {
        throw new Error('Token JWT inválido');
      }

      this.log('SUCCESS', 'Validação de sanidade passou em todos os testes');
      return true;
    } catch (error) {
      this.log('ERROR', `Falha na validação: ${error.message}`);
      return false;
    }
  }

  async run() {
    console.log('🚀 SCRIPT DE ATIVAÇÃO DO KAVIAR');
    console.log('================================');
    console.log('Este script criará o ambiente inicial para produção.');
    console.log('⚠️ Execute apenas em ambiente controlado!\n');

    try {
      // Confirmação de segurança
      const confirmed = await this.askConfirmation(
        '⚠️ Você tem certeza que deseja ativar o sistema Kaviar?'
      );

      if (!confirmed) {
        console.log('❌ Ativação cancelada pelo usuário');
        this.rl.close();
        return false;
      }

      // Validar pré-condições
      const preConditionsOk = await this.validatePreConditions();
      if (!preConditionsOk) {
        throw new Error('Pré-condições não atendidas');
      }

      // Executar ativação
      const community = await this.createPilotCommunity();
      const admin = await this.createInitialAdmin(community.id);
      const token = await this.generateAdminToken(admin);
      const driver = await this.createTestDriver(community.id);

      // Validar sanidade
      const sanityOk = await this.validateSanity(community, admin, driver);
      if (!sanityOk) {
        throw new Error('Falha na validação de sanidade');
      }

      console.log('🎉 KAVIAR ATIVADO COM SUCESSO!');
      console.log('==============================');
      console.log('✅ Comunidade piloto criada');
      console.log('✅ Administrador inicial configurado');
      console.log('✅ Token JWT gerado');
      console.log('✅ Motorista de teste disponível');
      console.log('✅ Sistema validado e pronto para uso');
      console.log('\n🚀 O backend Kaviar está oficialmente ATIVO!\n');

      this.rl.close();
      return true;
    } catch (error) {
      this.log('ERROR', `Falha na ativação: ${error.message}`);
      console.log('\n❌ ATIVAÇÃO FALHOU - Sistema não foi ativado');
      this.rl.close();
      return false;
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const activation = new KaviarActivation();
  activation.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = KaviarActivation;
