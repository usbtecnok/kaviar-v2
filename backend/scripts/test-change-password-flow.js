#!/usr/bin/env node

/**
 * Script de teste do fluxo completo de troca de senha
 * Testa 3 contas: 1 SUPER_ADMIN (suporte), 1 SUPER_ADMIN (financeiro), 1 ANGEL_VIEWER (angel1)
 */

const API_BASE_URL = 'https://api.kaviar.com.br';

const TEMP_PASSWORD = 'z4939ia4';

const TEST_ACCOUNTS = [
  { email: 'suporte@kaviar.com.br', role: 'SUPER_ADMIN', newPassword: 'SuperAdmin2026!' },
  { email: 'financeiro@kaviar.com.br', role: 'SUPER_ADMIN', newPassword: 'Financeiro2026!' },
  { email: 'angel1@kaviar.com', role: 'ANGEL_VIEWER', newPassword: 'Angel1Viewer2026!' }
];

async function testAccount(account) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TESTANDO: ${account.email} (${account.role})`);
  console.log('='.repeat(60));

  try {
    // 1. Login com senha temporária
    console.log('\n1️⃣  Login com senha temporária...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: TEMP_PASSWORD
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success) {
      console.error('❌ Login falhou:', loginData.error);
      return false;
    }

    console.log('✅ Login OK');
    console.log(`   Token: ${loginData.data.token.substring(0, 20)}...`);
    console.log(`   Must Change Password: ${loginData.data.mustChangePassword}`);

    if (!loginData.data.mustChangePassword) {
      console.error('❌ ERRO: mustChangePassword deveria ser true');
      return false;
    }

    const token = loginData.data.token;

    // 2. Trocar senha
    console.log('\n2️⃣  Trocando senha...');
    const changeResponse = await fetch(`${API_BASE_URL}/api/admin/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: TEMP_PASSWORD,
        newPassword: account.newPassword
      })
    });

    const changeData = await changeResponse.json();

    if (!changeData.success) {
      console.error('❌ Troca de senha falhou:', changeData.error);
      return false;
    }

    console.log('✅ Senha trocada com sucesso');

    // 3. Tentar login com senha antiga (deve falhar)
    console.log('\n3️⃣  Testando senha antiga (deve falhar)...');
    const oldLoginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: TEMP_PASSWORD
      })
    });

    const oldLoginData = await oldLoginResponse.json();

    if (oldLoginData.success) {
      console.error('❌ ERRO: Login com senha antiga deveria falhar');
      return false;
    }

    console.log('✅ Senha antiga rejeitada corretamente');

    // 4. Login com nova senha
    console.log('\n4️⃣  Login com nova senha...');
    const newLoginResponse = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: account.newPassword
      })
    });

    const newLoginData = await newLoginResponse.json();

    if (!newLoginData.success) {
      console.error('❌ Login com nova senha falhou:', newLoginData.error);
      return false;
    }

    console.log('✅ Login com nova senha OK');
    console.log(`   Must Change Password: ${newLoginData.data.mustChangePassword}`);

    if (newLoginData.data.mustChangePassword) {
      console.error('❌ ERRO: mustChangePassword deveria ser false após troca');
      return false;
    }

    // 5. Testar acesso a endpoint protegido
    console.log('\n5️⃣  Testando acesso ao admin...');
    const newToken = newLoginData.data.token;
    
    const driversResponse = await fetch(`${API_BASE_URL}/api/admin/drivers`, {
      headers: { 'Authorization': `Bearer ${newToken}` }
    });

    if (!driversResponse.ok) {
      console.error('❌ Acesso ao admin falhou:', driversResponse.status);
      return false;
    }

    console.log('✅ Acesso ao admin OK');

    // 6. Resetar senha para temporária (para próximos testes)
    console.log('\n6️⃣  Resetando senha para temporária...');
    const resetResponse = await fetch(`${API_BASE_URL}/api/admin/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
      },
      body: JSON.stringify({
        currentPassword: account.newPassword,
        newPassword: TEMP_PASSWORD
      })
    });

    const resetData = await resetResponse.json();

    if (!resetData.success) {
      console.error('⚠️  Aviso: Não foi possível resetar senha:', resetData.error);
    } else {
      console.log('✅ Senha resetada para temporária');
    }

    console.log('\n✅ TODOS OS TESTES PASSARAM PARA', account.email);
    return true;

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     🧪 TESTE DE FLUXO DE TROCA DE SENHA - ADMIN             ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const results = [];

  for (const account of TEST_ACCOUNTS) {
    const success = await testAccount(account);
    results.push({ email: account.email, success });
  }

  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     📊 RESUMO DOS TESTES                                     ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.email}`);
  });

  const allPassed = results.every(r => r.success);
  const passedCount = results.filter(r => r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passedCount}/${results.length} testes passaram`);
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
    process.exit(0);
  } else {
    console.log('\n❌ ALGUNS TESTES FALHARAM\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
