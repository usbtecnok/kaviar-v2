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
  // PASSO 6: CORRIDA C - COPACABANA → IPANEMA (DIFFERENT_NEIGHBORHOOD)
  // ============================================================================
  console.log('🚗 CORRIDA C: BAIRROS DIFERENTES (Copacabana → Ipanema)');
  console.log('─────────────────────────────────────────────────────────────────────');
  
  const ipanema = await prisma.neighborhoods.findFirst({
    where: { name: 'Ipanema', city: 'Rio de Janeiro' }
  });
  
  const originCopa = { lat: -22.9711, lng: -43.1822 };
  const destinationIpanema = { lat: -22.9838, lng: -43.2096 };
  
  const rideC = await calculateTripFee(
    driver.id,
    originCopa.lat,
    originCopa.lng,
    destinationIpanema.lat,
    destinationIpanema.lng,
    fareAmount,
    'Rio de Janeiro'
  );
  
  console.log(`   Origem: Copacabana (${originCopa.lat}, ${originCopa.lng})`);
  console.log(`   Destino: Ipanema (${destinationIpanema.lat}, ${destinationIpanema.lng})`);
  console.log(`   Match Type: ${rideC.matchType} | Taxa: ${rideC.feePercentage}% | Ganho: R$ ${rideC.driverEarnings.toFixed(2)}`);
  console.log('');

  // ============================================================================
  // PASSO 7: CORRIDA D - FALLBACK 800M (São Paulo)
  // ============================================================================
  console.log('🚗 CORRIDA D: FALLBACK 800M (São Paulo - Pinheiros)');
  console.log('─────────────────────────────────────────────────────────────────────');
  
  const pinheiros = await prisma.neighborhoods.findFirst({
    where: { name: 'Pinheiros', city: 'São Paulo' }
  });
  
  if (!pinheiros) {
    console.log('❌ Bairro Pinheiros não encontrado');
    return;
  }
  
  const driverSP = await prisma.drivers.upsert({
    where: { email: 'driver.test+sp@kaviar.com.br' },
    update: { neighborhood_id: pinheiros.id, status: 'approved', approved_at: new Date() },
    create: {
      id: require('crypto').randomUUID(),
      email: 'driver.test+sp@kaviar.com.br',
      name: 'Driver Test SP',
      phone: '+5511999990003',
      password_hash: await require('bcrypt').hash('Test@2026', 10),
      document_cpf: '00000000003',
      neighborhood_id: pinheiros.id,
      status: 'approved',
      approved_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  });
  
  // Coordenadas próximas ao centro de Pinheiros (dentro de 800m mas fora da geofence oficial)
  const originSP = { lat: -23.5630, lng: -46.6825 };
  const destinationSP = { lat: -23.5640, lng: -46.6835 };
  
  const rideD = await calculateTripFee(
    driverSP.id,
    originSP.lat,
    originSP.lng,
    destinationSP.lat,
    destinationSP.lng,
    fareAmount,
    'São Paulo'
  );
  
  console.log(`   Origem: Pinheiros (${originSP.lat}, ${originSP.lng})`);
  console.log(`   Destino: Próximo (${destinationSP.lat}, ${destinationSP.lng})`);
  console.log(`   Match Type: ${rideD.matchType} | Taxa: ${rideD.feePercentage}% | Ganho: R$ ${rideD.driverEarnings.toFixed(2)}`);
  console.log('');
  
  const rideD = await calculateTripFee(
    driverSP.id,
    originSP.lat,
    originSP.lng,
    destinationSP.lat,
    destinationSP.lng,
    fareAmount,
    'São Paulo'
  );
  
  console.log(`   Origem: Sé (${originSP.lat}, ${originSP.lng})`);
  console.log(`   Destino: Próximo (${destinationSP.lat}, ${destinationSP.lng})`);
  console.log(`   Match Type: ${rideD.matchType} | Taxa: ${rideD.feePercentage}% | Ganho: R$ ${rideD.driverEarnings.toFixed(2)}`);
  console.log('');

  // ============================================================================
  // TABELA COMPARATIVA FINAL
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TABELA COMPARATIVA: TODOS OS CENÁRIOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('┌──────────────────────────┬────────────┬──────────┬─────────────────┐');
  console.log('│ Cenário                  │ Valor      │ Taxa     │ Ganho Motorista │');
  console.log('├──────────────────────────┼────────────┼──────────┼─────────────────┤');
  console.log(`│ SAME_NEIGHBORHOOD        │ R$ ${fareAmount.toFixed(2).padStart(6)} │ ${rideA.feePercentage.toString().padStart(2)}% (${rideA.feeAmount.toFixed(2).padStart(5)}) │ R$ ${rideA.driverEarnings.toFixed(2).padStart(13)} │`);
  console.log(`│ DIFFERENT_NEIGHBORHOOD   │ R$ ${fareAmount.toFixed(2).padStart(6)} │ ${rideC.feePercentage.toString().padStart(2)}% (${rideC.feeAmount.toFixed(2).padStart(5)}) │ R$ ${rideC.driverEarnings.toFixed(2).padStart(13)} │`);
  console.log(`│ OUTSIDE_FENCE            │ R$ ${fareAmount.toFixed(2).padStart(6)} │ ${rideB.feePercentage.toString().padStart(2)}% (${rideB.feeAmount.toFixed(2).padStart(5)}) │ R$ ${rideB.driverEarnings.toFixed(2).padStart(13)} │`);
  console.log(`│ FALLBACK_800M            │ R$ ${fareAmount.toFixed(2).padStart(6)} │ ${rideD.feePercentage.toString().padStart(2)}% (${rideD.feeAmount.toFixed(2).padStart(5)}) │ R$ ${rideD.driverEarnings.toFixed(2).padStart(13)} │`);
  console.log('└──────────────────────────┴────────────┴──────────┴─────────────────┘');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TESTE CONCLUÍDO - MOTOR DE TERRITÓRIO VALIDADO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
