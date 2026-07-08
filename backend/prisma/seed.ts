import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Inicializando dados padrão...');

  // Admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.admins.upsert({
    where: { email: 'admin@kaviar.com' },
    update: { password: hashedPassword },
    create: {
      name: 'Admin Kaviar',
      email: 'admin@kaviar.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      is_active: true,
      must_change_password: false,
    },
  });
  console.log('✅ Admin: admin@kaviar.com / admin123');

  // Bairro de teste
  const neighborhood = await prisma.neighborhoods.upsert({
    where: { id: 'bairro-centro-rj' },
    update: {},
    create: {
      id: 'bairro-centro-rj',
      name: 'Centro',
      city: 'Rio de Janeiro',
      area_type: 'BAIRRO_OFICIAL',
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log('✅ Bairro: Centro - RJ');

  // Comunidade de teste
  await prisma.communities.upsert({
    where: { id: 'comunidade-centro-rj' },
    update: {},
    create: {
      id: 'comunidade-centro-rj',
      name: 'Comunidade Centro RJ',
      is_active: true,
      updated_at: new Date(),
    },
  });
  console.log('✅ Comunidade: Comunidade Centro RJ');

  // Motorista de teste
  const driverPassword = await bcrypt.hash('driver123', 10);
  await prisma.drivers.upsert({
    where: { email: 'motorista@kaviar.com' },
    update: { password_hash: driverPassword },
    create: {
      id: 'driver-test-001',
      name: 'Motorista Teste',
      email: 'motorista@kaviar.com',
      phone: '21999990001',
      password_hash: driverPassword,
      status: 'approved',
      neighborhood_id: neighborhood.id,
      document_cpf: '000.000.000-00',
      vehicle_color: 'Prata',
      vehicle_model: 'Gol 2020',
      vehicle_plate: 'ABC-1234',
      updated_at: new Date(),
    },
  });
  console.log('✅ Motorista: motorista@kaviar.com / driver123 (approved)');

  // Motorista pendente (para testar fluxo de documentos)
  await prisma.drivers.upsert({
    where: { email: 'novo.motorista@kaviar.com' },
    update: { password_hash: driverPassword },
    create: {
      id: 'driver-test-002',
      name: 'Novo Motorista',
      email: 'novo.motorista@kaviar.com',
      phone: '21999990002',
      password_hash: driverPassword,
      status: 'pending',
      neighborhood_id: neighborhood.id,
      document_cpf: '111.111.111-11',
      vehicle_color: 'Branco',
      updated_at: new Date(),
    },
  });
  console.log('✅ Motorista pendente: novo.motorista@kaviar.com / driver123 (pending)');

  // Passageiro de teste (para fluxo de corrida v2)
  const passengerPassword = await bcrypt.hash('pass123', 10);
  await prisma.passengers.upsert({
    where: { email: 'passageiro@kaviar.com' },
    update: { password_hash: passengerPassword },
    create: {
      id: 'passenger-test-001',
      name: 'Passageiro Teste',
      email: 'passageiro@kaviar.com',
      phone: '21999990003',
      password_hash: passengerPassword,
      status: 'ACTIVE',
      updated_at: new Date(),
    },
  });

  // Consent LGPD do passageiro (obrigatório para login)
  await prisma.user_consents.upsert({
    where: { passenger_id_consent_type: { passenger_id: 'passenger-test-001', consent_type: 'LGPD' } },
    update: { accepted: true },
    create: {
      id: 'consent-lgpd-passenger-test-001',
      passenger_id: 'passenger-test-001',
      consent_type: 'LGPD',
      accepted: true,
      accepted_at: new Date(),
      ip_address: '127.0.0.1',
    },
  });
  console.log('✅ Passageiro: passageiro@kaviar.com / pass123 (ACTIVE + LGPD)');

  // Território operacional RJ
  const rjState = await prisma.operational_territories.upsert({
    where: { id: 'territory-rj-state' },
    update: {},
    create: {
      id: 'territory-rj-state',
      name: 'Rio de Janeiro',
      level: 'state',
      center_lat: -22.90685,
      center_lng: -43.1729,
    },
  });
  const rjCity = await prisma.operational_territories.upsert({
    where: { id: 'territory-rj-city' },
    update: {},
    create: {
      id: 'territory-rj-city',
      name: 'Rio de Janeiro',
      level: 'city',
      parent_id: rjState.id,
      center_lat: -22.90685,
      center_lng: -43.1729,
    },
  });
  // Vincular bairro de teste ao território
  await prisma.neighborhoods.update({
    where: { id: 'bairro-centro-rj' },
    data: { territory_id: rjCity.id },
  });
  console.log('✅ Território: RJ (state) → Rio de Janeiro (city)');

  // Regras municipais iniciais: Santa Rita do Passa Quatro/SP
  const santaRitaCar = await prisma.municipal_regulations.upsert({
    where: {
      id: 'municipal-reg-santa-rita-sp-car',
    },
    update: {
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requires_protocol: true,
      max_vehicle_age_years: 12,
      responsible_agency: 'Departamento de Serviços Municipais',
      notes: 'regulamentação municipal para transporte remunerado privado individual de passageiros por aplicativo.',
      is_active: true,
    },
    create: {
      id: 'municipal-reg-santa-rita-sp-car',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requires_protocol: true,
      max_vehicle_age_years: 12,
      responsible_agency: 'Departamento de Serviços Municipais',
      notes: 'regulamentação municipal para transporte remunerado privado individual de passageiros por aplicativo.',
      is_active: true,
    },
  });

  await prisma.municipal_regulation_requirements.deleteMany({
    where: { regulation_id: santaRitaCar.id },
  });

  await prisma.municipal_regulation_requirements.createMany({
    data: [
      { regulation_id: santaRitaCar.id, requirement_key: 'CNH_B_EAR', label: 'CNH categoria B ou superior com EAR', document_type: 'CNH', is_required: true, sort_order: 1 },
      { regulation_id: santaRitaCar.id, requirement_key: 'BACKGROUND_CHECK', label: 'Certidão negativa de antecedentes criminais', document_type: 'BACKGROUND_CHECK', is_required: true, sort_order: 2 },
      { regulation_id: santaRitaCar.id, requirement_key: 'INSS_MEI', label: 'INSS contribuinte individual ou MEI', document_type: 'INSS_OR_MEI_PROOF', is_required: true, sort_order: 3 },
      { regulation_id: santaRitaCar.id, requirement_key: 'SEGURO_APP', label: 'Seguro APP', document_type: 'APP_INSURANCE', is_required: true, sort_order: 4 },
      { regulation_id: santaRitaCar.id, requirement_key: 'DPVAT', label: 'DPVAT/seguro obrigatório, conforme exigência vigente', document_type: 'MANDATORY_INSURANCE', is_required: true, sort_order: 5 },
      { regulation_id: santaRitaCar.id, requirement_key: 'CRLV', label: 'CRLV regular', document_type: 'CRLV', is_required: true, sort_order: 6 },
      { regulation_id: santaRitaCar.id, requirement_key: 'VEHICLE_AUTHORIZATION', label: 'Contrato de arrendamento/locação/comodato se veículo não estiver no nome do condutor', document_type: 'VEHICLE_AUTHORIZATION_CONTRACT', is_required: true, sort_order: 7 },
      { regulation_id: santaRitaCar.id, requirement_key: 'PROOF_OF_ADDRESS_90_DAYS', label: 'Comprovante de residência expedido nos últimos 90 dias', document_type: 'PROOF_OF_ADDRESS', is_required: true, sort_order: 8 },
      { regulation_id: santaRitaCar.id, requirement_key: 'PHOTO_3X4', label: '2 fotos 3x4 ou foto padrão documento', document_type: 'PROFILE_PHOTO', is_required: true, sort_order: 9 },
      { regulation_id: santaRitaCar.id, requirement_key: 'MUNICIPAL_REGISTRATION', label: 'Inscrição junto à Divisão de Arrecadação Municipal', document_type: 'MUNICIPAL_REGISTRATION', is_required: true, sort_order: 10 },
      { regulation_id: santaRitaCar.id, requirement_key: 'MUNICIPAL_DEBT_CLEARANCE', label: 'Certidão negativa de débitos municipais', document_type: 'MUNICIPAL_DEBT_CLEARANCE', is_required: true, sort_order: 11 },
      { regulation_id: santaRitaCar.id, requirement_key: 'MUNICIPAL_TAX_PAYMENT', label: 'Comprovante de recolhimento de tributos municipais, quando aplicável', document_type: 'MUNICIPAL_TAX_PAYMENT_PROOF', is_required: false, sort_order: 12 },
      { regulation_id: santaRitaCar.id, requirement_key: 'VEHICLE_GOOD_CONDITION_DECLARATION', label: 'Declaração de veículo em bom estado de conservação, funcionamento, segurança, higiene e limpeza', document_type: 'VEHICLE_CONDITION_DECLARATION', is_required: true, sort_order: 13 },
      { regulation_id: santaRitaCar.id, requirement_key: 'MAX_VEHICLE_AGE_12', label: 'Validação de veículo com no máximo 12 anos de fabricação', document_type: 'VEHICLE_YEAR_VALIDATION', is_required: true, sort_order: 14 },
    ],
  });

  await prisma.municipal_regulations.upsert({
    where: {
      id: 'municipal-reg-santa-rita-sp-moto-passenger',
    },
    update: {
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'MOTO_PASSENGER',
      regulation_status: 'REQUIRES_CONFIRMATION',
      requires_city_approval: true,
      requires_protocol: true,
      responsible_agency: 'Departamento de Serviços Municipais',
      notes: 'Modalidade de moto passageiro requer confirmação formal da Prefeitura antes de habilitar operação.',
      is_active: true,
    },
    create: {
      id: 'municipal-reg-santa-rita-sp-moto-passenger',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'MOTO_PASSENGER',
      regulation_status: 'REQUIRES_CONFIRMATION',
      requires_city_approval: true,
      requires_protocol: true,
      responsible_agency: 'Departamento de Serviços Municipais',
      notes: 'Modalidade de moto passageiro requer confirmação formal da Prefeitura antes de habilitar operação.',
      is_active: true,
    },
  });

  console.log('✅ Regras municipais: Santa Rita do Passa Quatro/SP (CAR regulado + MOTO_PASSENGER requer confirmação)');

  console.log('\n🎉 Seed completo!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
