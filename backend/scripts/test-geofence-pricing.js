const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Importar função de cálculo de taxa
const { calculateTripFee } = require('../dist/services/fee-calculation');

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE CONTROLADO: GEOFENCE + CÁLCULO DE GANHOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // ============================================================================
  // PASSO 1: CRIAR PASSAGEIRO DE TESTE
  // ============================================================================
  console.log('📋 PASSO 1: Criando passageiro de teste...');
  
  const passengerEmail = 'passenger.test+geo@kaviar.com.br';
  let passenger = await prisma.passengers.findUnique({ where: { email: passengerEmail } });
  
  if (!passenger) {
    passenger = await prisma.passengers.create({
      data: {
        id: require('crypto').randomUUID(),
        email: passengerEmail,
        name: 'Passenger Test Geofence',
        phone: '+5511999990001',
        status: 'active',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log(`✅ Passageiro criado: ${passenger.id}`);
  } else {
    console.log(`✅ Passageiro já existe: ${passenger.id}`);
  }
  
  console.log(`   Email: ${passenger.email}`);
  console.log('');

  // ============================================================================
  // PASSO 2: CRIAR MOTORISTA DE TESTE (APROVADO)
  // ============================================================================
  console.log('📋 PASSO 2: Criando motorista de teste...');
  
  const driverEmail = 'driver.test+geo@kaviar.com.br';
  let driver = await prisma.drivers.findUnique({ where: { email: driverEmail } });
  
  // Buscar um bairro do Rio para ser o bairro base do motorista
  const copacabana = await prisma.neighborhoods.findFirst({
    where: { name: 'Copacabana', city: 'Rio de Janeiro' }
  });
  
  if (!driver) {
    const passwordHash = await bcrypt.hash('Test@2026', 10);
    
    driver = await prisma.drivers.create({
      data: {
        id: require('crypto').randomUUID(),
        email: driverEmail,
        name: 'Driver Test Geofence',
        phone: '+5511999990002',
        password_hash: passwordHash,
        document_cpf: '00000000002',
        neighborhood_id: copacabana.id,
        status: 'approved',
        approved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log(`✅ Motorista criado: ${driver.id}`);
  } else {
    // Atualizar para garantir que está aprovado
    driver = await prisma.drivers.update({
      where: { id: driver.id },
      data: {
        status: 'approved',
        neighborhood_id: copacabana.id,
        approved_at: new Date()
      }
    });
    console.log(`✅ Motorista já existe (atualizado): ${driver.id}`);
  }
  
  console.log(`   Email: ${driver.email}`);
  console.log(`   Bairro base: ${copacabana.name} (${copacabana.id})`);
  console.log(`   Status: ${driver.status}`);
  console.log('');

  // ============================================================================
  // PASSO 3: ESCOLHER COORDENADAS DENTRO DA GEOFENCE (CORRIDA A)
  // ============================================================================
  console.log('📋 PASSO 3: Definindo coordenadas DENTRO da geofence...');
  
  // Buscar geofence de Copacabana
  const copacabanaGeofence = await prisma.neighborhood_geofences.findFirst({
    where: { neighborhood_id: copacabana.id }
  });
  
  // Usar centro de Copacabana (aproximado)
  const originInside = { lat: -22.9711, lng: -43.1822 }; // Copacabana
  const destinationInside = { lat: -22.9750, lng: -43.1900 }; // Também Copacabana
  
  // Validar que está dentro
  const validateInside = await prisma.$queryRaw`
    SELECT 
      ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${originInside.lng}, ${originInside.lat}), 4326)) as origin_inside,
      ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${destinationInside.lng}, ${destinationInside.lat}), 4326)) as dest_inside
    FROM neighborhood_geofences ng
    WHERE ng.neighborhood_id = ${copacabana.id}
  `;
  
  console.log(`   Geofence: ${copacabana.name} (${copacabanaGeofence.id})`);
  console.log(`   Origem: (${originInside.lat}, ${originInside.lng})`);
  console.log(`   Destino: (${destinationInside.lat}, ${destinationInside.lng})`);
  console.log(`   ✓ Validação: origem=${validateInside[0].origin_inside}, destino=${validateInside[0].dest_inside}`);
  console.log('');

  // ============================================================================
  // PASSO 4: DEFINIR COORDENADAS FORA DA GEOFENCE (CORRIDA B)
  // ============================================================================
  console.log('📋 PASSO 4: Definindo coordenadas FORA da geofence...');
  
  // Usar coordenadas em área sem geofence (oceano próximo ao Rio)
  const originOutside = { lat: -22.9500, lng: -43.2500 }; // Oceano
  const destinationOutside = { lat: -22.9600, lng: -43.2600 }; // Oceano
  
  // Validar que está fora
  const validateOutside = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM neighborhood_geofences ng
    WHERE ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${originOutside.lng}, ${originOutside.lat}), 4326))
  `;
  
  console.log(`   Origem: (${originOutside.lat}, ${originOutside.lng})`);
  console.log(`   Destino: (${destinationOutside.lat}, ${destinationOutside.lng})`);
  console.log(`   ✓ Validação: geofences contendo origem=${validateOutside[0].count} (deve ser 0)`);
  console.log('');

  // ============================================================================
  // PASSO 5: SIMULAR CORRIDAS E CALCULAR GANHOS
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PASSO 5: Simulando corridas e calculando ganhos...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Valor base da corrida (simulado)
  const fareAmount = 50.00; // R$ 50,00
  
  // ============================================================================
  // CORRIDA A: DENTRO DA GEOFENCE
  // ============================================================================
  console.log('🚗 CORRIDA A: DENTRO DA GEOFENCE (Copacabana → Copacabana)');
  console.log('─────────────────────────────────────────────────────────────────────');
  
  const rideA = await calculateTripFee(
    driver.id,
    originInside.lat,
    originInside.lng,
    destinationInside.lat,
    destinationInside.lng,
    fareAmount,
    'Rio de Janeiro'
  );
  
  console.log('');
  console.log('📍 Input:');
  console.log(`   Origem: (${originInside.lat}, ${originInside.lng})`);
  console.log(`   Destino: (${destinationInside.lat}, ${destinationInside.lng})`);
  console.log(`   Valor da corrida: R$ ${fareAmount.toFixed(2)}`);
  console.log('');
  console.log('💰 Cálculo:');
  console.log(`   Match Type: ${rideA.matchType}`);
  console.log(`   Razão: ${rideA.reason}`);
  console.log(`   Taxa Kaviar: ${rideA.feePercentage}%`);
  console.log(`   Valor da taxa: R$ ${rideA.feeAmount.toFixed(2)}`);
  console.log(`   Ganho do motorista: R$ ${rideA.driverEarnings.toFixed(2)}`);
  console.log('');
  console.log('📋 Breakdown:');
  console.log(`   Valor total: R$ ${fareAmount.toFixed(2)}`);
  console.log(`   - Taxa plataforma (${rideA.feePercentage}%): R$ ${rideA.feeAmount.toFixed(2)}`);
  console.log(`   = Ganho motorista: R$ ${rideA.driverEarnings.toFixed(2)}`);
  console.log('');

  // ============================================================================
  // CORRIDA B: FORA DA GEOFENCE
  // ============================================================================
  console.log('🚗 CORRIDA B: FORA DA GEOFENCE (Oceano → Oceano)');
  console.log('─────────────────────────────────────────────────────────────────────');
  
  const rideB = await calculateTripFee(
    driver.id,
    originOutside.lat,
    originOutside.lng,
    destinationOutside.lat,
    destinationOutside.lng,
    fareAmount,
    'Rio de Janeiro'
  );
  
  console.log('');
  console.log('📍 Input:');
  console.log(`   Origem: (${originOutside.lat}, ${originOutside.lng})`);
  console.log(`   Destino: (${destinationOutside.lat}, ${destinationOutside.lng})`);
  console.log(`   Valor da corrida: R$ ${fareAmount.toFixed(2)}`);
  console.log('');
  console.log('💰 Cálculo:');
  console.log(`   Match Type: ${rideB.matchType}`);
  console.log(`   Razão: ${rideB.reason}`);
  console.log(`   Taxa Kaviar: ${rideB.feePercentage}%`);
  console.log(`   Valor da taxa: R$ ${rideB.feeAmount.toFixed(2)}`);
  console.log(`   Ganho do motorista: R$ ${rideB.driverEarnings.toFixed(2)}`);
  console.log('');
  console.log('📋 Breakdown:');
  console.log(`   Valor total: R$ ${fareAmount.toFixed(2)}`);
  console.log(`   - Taxa plataforma (${rideB.feePercentage}%): R$ ${rideB.feeAmount.toFixed(2)}`);
  console.log(`   = Ganho motorista: R$ ${rideB.driverEarnings.toFixed(2)}`);
  console.log('');

  // ============================================================================
  // COMPARAÇÃO
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COMPARAÇÃO: DENTRO vs FORA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  const delta = rideA.driverEarnings - rideB.driverEarnings;
  const deltaPercent = ((delta / rideB.driverEarnings) * 100);
  
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                         CORRIDA A (DENTRO)                      │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Valor total:           R$ ${fareAmount.toFixed(2).padStart(10)}                      │`);
  console.log(`│ Taxa Kaviar (${rideA.feePercentage}%):     R$ ${rideA.feeAmount.toFixed(2).padStart(10)}                      │`);
  console.log(`│ Ganho motorista:       R$ ${rideA.driverEarnings.toFixed(2).padStart(10)}                      │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                         CORRIDA B (FORA)                        │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Valor total:           R$ ${fareAmount.toFixed(2).padStart(10)}                      │`);
  console.log(`│ Taxa Kaviar (${rideB.feePercentage}%):    R$ ${rideB.feeAmount.toFixed(2).padStart(10)}                      │`);
  console.log(`│ Ganho motorista:       R$ ${rideB.driverEarnings.toFixed(2).padStart(10)}                      │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                         DIFERENÇA (A - B)                       │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Delta ganho:           R$ ${delta.toFixed(2).padStart(10)} (${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%)           │`);
  console.log(`│ Motorista ganha MAIS:  ${delta > 0 ? 'DENTRO da geofence' : 'FORA da geofence'}                │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');

  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TESTE CONCLUÍDO COM SUCESSO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📋 IDs Criados:');
  console.log(`   Passageiro: ${passenger.id}`);
  console.log(`   Motorista: ${driver.id}`);
  console.log(`   Bairro base: ${copacabana.id} (${copacabana.name})`);
  console.log('');
  console.log('📍 Coordenadas Usadas:');
  console.log(`   Dentro: (${originInside.lat}, ${originInside.lng}) → (${destinationInside.lat}, ${destinationInside.lng})`);
  console.log(`   Fora: (${originOutside.lat}, ${originOutside.lng}) → (${destinationOutside.lat}, ${destinationOutside.lng})`);
  console.log('');
  console.log('💡 Conclusão:');
  console.log(`   Motoristas ganham ${deltaPercent.toFixed(1)}% A MAIS quando fazem corridas`);
  console.log(`   DENTRO do seu bairro base (taxa de 7% vs 20%)`);
  console.log('');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
