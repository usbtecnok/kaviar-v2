import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type FinanceCategorySeed = {
  code: string;
  name: string;
  kind: string;
  parent_code?: string | null;
  default_direction?: string | null;
  requires_document?: boolean;
  sort_order?: number;
};

type FinanceCostCenterSeed = {
  code: string;
  name: string;
  type: string;
  parent_code?: string | null;
  territory_code?: string | null;
  city?: string | null;
  state?: string | null;
  is_active?: boolean;
};

type FinanceRecognitionPolicySeed = {
  code: string;
  subject: string;
  scope_type: string;
  policy: string;
  status: string;
  reason: string;
  notes?: string | null;
};

export const FINANCE_CATEGORY_SEEDS: FinanceCategorySeed[] = [
  { code: 'receita', name: 'Receitas', kind: 'REVENUE', sort_order: 10 },
  { code: 'receita.taxa_corrida', name: 'Taxa de corrida', kind: 'REVENUE', parent_code: 'receita', sort_order: 11 },
  { code: 'receita.adesao_gestor', name: 'Adesão de gestor', kind: 'REVENUE', parent_code: 'receita', sort_order: 12 },
  { code: 'receita.mensalidade', name: 'Mensalidade', kind: 'REVENUE', parent_code: 'receita', sort_order: 13 },
  { code: 'receita.servico_comercial', name: 'Serviço comercial', kind: 'REVENUE', parent_code: 'receita', sort_order: 14 },
  { code: 'receita.combo_premium', name: 'Combo premium', kind: 'REVENUE', parent_code: 'receita', sort_order: 15 },
  { code: 'receita.outras_receitas', name: 'Outras receitas', kind: 'REVENUE', parent_code: 'receita', sort_order: 16 },
  { code: 'despesa', name: 'Despesas', kind: 'EXPENSE', sort_order: 20 },
  { code: 'despesa.aws', name: 'AWS', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 21 },
  { code: 'despesa.cloudflare', name: 'Cloudflare', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 22 },
  { code: 'despesa.twilio', name: 'Twilio', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 23 },
  { code: 'despesa.google_play', name: 'Google/Play Store', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 24 },
  { code: 'despesa.expo', name: 'Expo', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 25 },
  { code: 'despesa.dominio', name: 'Domínio', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 26 },
  { code: 'despesa.contabilidade', name: 'Contabilidade', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 27 },
  { code: 'despesa.juridico', name: 'Jurídico', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 28 },
  { code: 'despesa.marketing', name: 'Marketing', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 29 },
  { code: 'despesa.taxas_bancarias', name: 'Taxas bancárias', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 30 },
  { code: 'despesa.sumup', name: 'SumUp', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 31 },
  { code: 'despesa.asaas', name: 'Asaas', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 32 },
  { code: 'despesa.despesas_municipais', name: 'Despesas municipais', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 33 },
  { code: 'despesa.equipamentos', name: 'Equipamentos', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 34 },
  { code: 'despesa.telefonia_internet', name: 'Telefonia/internet', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 35 },
  { code: 'despesa.reembolsos', name: 'Reembolsos', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 36 },
  { code: 'despesa.pro_labore', name: 'Pró-labore', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 37 },
  { code: 'despesa.impostos', name: 'Impostos', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 38 },
  { code: 'despesa.outras_despesas', name: 'Outras despesas', kind: 'EXPENSE', parent_code: 'despesa', sort_order: 39 },
  { code: 'aporte', name: 'Aportes', kind: 'CONTRIBUTION', sort_order: 40 },
  { code: 'aporte.socio', name: 'Aporte de sócio', kind: 'CONTRIBUTION', parent_code: 'aporte', sort_order: 41 },
  { code: 'retirada', name: 'Retiradas', kind: 'WITHDRAWAL', sort_order: 50 },
  { code: 'retirada.socio', name: 'Retirada de sócio', kind: 'WITHDRAWAL', parent_code: 'retirada', sort_order: 51 },
  { code: 'transferencia', name: 'Transferências', kind: 'TRANSFER', sort_order: 60 },
  { code: 'transferencia.interna', name: 'Transferência interna', kind: 'TRANSFER', parent_code: 'transferencia', sort_order: 61 },
  { code: 'passivo', name: 'Passivos de terceiros', kind: 'LIABILITY', sort_order: 70 },
  { code: 'passivo.creditos_pre_pagos', name: 'Créditos pré-pagos', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 71 },
  { code: 'passivo.valores_motoristas', name: 'Valores de motoristas', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 72 },
  { code: 'passivo.valores_gestores', name: 'Valores de gestores', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 73 },
  { code: 'passivo.valores_comercios', name: 'Valores de comércios', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 74 },
  { code: 'passivo.retencoes', name: 'Retenções', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 75 },
  { code: 'passivo.outros_terceiros', name: 'Outros terceiros', kind: 'LIABILITY', parent_code: 'passivo', sort_order: 76 },
];

export const FINANCE_COST_CENTER_SEEDS: FinanceCostCenterSeed[] = [
  { code: 'kaviar-geral', name: 'KAVIAR Geral', type: 'COMPANY', is_active: true },
  { code: 'tecnologia', name: 'Tecnologia', type: 'DEPARTMENT', parent_code: 'kaviar-geral', is_active: true },
  { code: 'marketing', name: 'Marketing', type: 'DEPARTMENT', parent_code: 'kaviar-geral', is_active: true },
  { code: 'regulatorio', name: 'Regulatório', type: 'DEPARTMENT', parent_code: 'kaviar-geral', is_active: true },
  { code: 'comercial', name: 'Comercial', type: 'DEPARTMENT', parent_code: 'kaviar-geral', is_active: true },
  { code: 'rio-de-janeiro', name: 'Rio de Janeiro', type: 'CITY', parent_code: 'kaviar-geral', territory_code: 'territory-rj-city', city: 'Rio de Janeiro', state: 'RJ', is_active: true },
  { code: 'tambau', name: 'Tambaú', type: 'CITY', parent_code: 'kaviar-geral', city: 'Tambaú', state: 'SP', is_active: true },
  { code: 'santa-rita-do-passa-quatro', name: 'Santa Rita do Passa Quatro', type: 'CITY', parent_code: 'kaviar-geral', city: 'Santa Rita do Passa Quatro', state: 'SP', is_active: true },
];

export const FINANCE_RECOGNITION_POLICY_SEEDS: FinanceRecognitionPolicySeed[] = [
  { code: 'ride_revenue.default', subject: 'RIDE_REVENUE', scope_type: 'GLOBAL', policy: 'UNCLASSIFIED', status: 'DRAFT', reason: 'Seed inicial sem classificação definitiva', notes: 'Política de entrada apenas para base do módulo financeiro.' },
  { code: 'prepaid_driver_credits.default', subject: 'PREPAID_DRIVER_CREDITS', scope_type: 'GLOBAL', policy: 'UNCLASSIFIED', status: 'DRAFT', reason: 'Seed inicial sem classificação definitiva', notes: 'Tratamento posterior como passivo.' },
  { code: 'manager_payments.default', subject: 'MANAGER_PAYMENTS', scope_type: 'GLOBAL', policy: 'UNCLASSIFIED', status: 'DRAFT', reason: 'Seed inicial sem classificação definitiva', notes: 'Pagamentos de gestores permanecem sem classificação definitiva.' },
  { code: 'commercial_payments.default', subject: 'COMMERCIAL_PAYMENTS', scope_type: 'GLOBAL', policy: 'UNCLASSIFIED', status: 'DRAFT', reason: 'Seed inicial sem classificação definitiva', notes: 'Pagamentos comerciais aguardam regra contábil.' },
  { code: 'other.default', subject: 'OTHER', scope_type: 'GLOBAL', policy: 'UNCLASSIFIED', status: 'DRAFT', reason: 'Seed inicial sem classificação definitiva', notes: 'Fallback sem decisão contábil.' },
];

async function seedFinancialFoundation(adminId: string, rioDeJaneiroTerritoryId: string) {
  const categoryByCode = new Map<string, { id: string }>();

  for (const seed of FINANCE_CATEGORY_SEEDS) {
    const parentId = seed.parent_code ? categoryByCode.get(seed.parent_code)?.id ?? null : null;
    const row = await prisma.financial_categories.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        kind: seed.kind,
        parent_id: parentId,
        default_direction: seed.default_direction ?? null,
        requires_document: seed.requires_document ?? false,
        is_system: true,
        is_active: true,
        sort_order: seed.sort_order ?? 0,
        updated_by_admin_id: adminId,
      },
      create: {
        code: seed.code,
        name: seed.name,
        kind: seed.kind,
        parent_id: parentId,
        default_direction: seed.default_direction ?? null,
        requires_document: seed.requires_document ?? false,
        is_system: true,
        is_active: true,
        sort_order: seed.sort_order ?? 0,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      },
    });

    categoryByCode.set(seed.code, { id: row.id });
  }

  const costCenterByCode = new Map<string, { id: string }>();

  for (const seed of FINANCE_COST_CENTER_SEEDS) {
    const parentId = seed.parent_code ? costCenterByCode.get(seed.parent_code)?.id ?? null : null;
    const territoryId = seed.territory_code === 'territory-rj-city' ? rioDeJaneiroTerritoryId : null;
    const row = await prisma.financial_cost_centers.upsert({
      where: { code: seed.code },
      update: {
        name: seed.name,
        type: seed.type,
        parent_id: parentId,
        territory_id: territoryId,
        city: seed.city ?? null,
        state: seed.state ?? null,
        is_active: seed.is_active ?? true,
        updated_by_admin_id: adminId,
      },
      create: {
        code: seed.code,
        name: seed.name,
        type: seed.type,
        parent_id: parentId,
        territory_id: territoryId,
        city: seed.city ?? null,
        state: seed.state ?? null,
        is_active: seed.is_active ?? true,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      },
    });

    costCenterByCode.set(seed.code, { id: row.id });
  }

  for (const seed of FINANCE_RECOGNITION_POLICY_SEEDS) {
    await prisma.financial_recognition_policies.upsert({
      where: { code: seed.code },
      update: {
        subject: seed.subject,
        scope_type: seed.scope_type,
        policy: seed.policy,
        status: seed.status,
        effective_from: new Date('2026-01-01T00:00:00.000Z'),
        effective_until: null,
        reason: seed.reason,
        notes: seed.notes ?? null,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      },
      create: {
        code: seed.code,
        subject: seed.subject,
        scope_type: seed.scope_type,
        policy: seed.policy,
        status: seed.status,
        effective_from: new Date('2026-01-01T00:00:00.000Z'),
        effective_until: null,
        reason: seed.reason,
        notes: seed.notes ?? null,
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      },
    });
  }
}

async function main() {
  console.log('🔧 Inicializando dados padrão...');

  // Admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.admins.upsert({
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

  await seedFinancialFoundation(admin.id, rjCity.id);
  console.log('✅ Base financeira 1A: categorias, centros de custo e políticas UNCLASSIFIED');

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

export { seedFinancialFoundation };
