import { prisma } from '../lib/prisma';

export const MUNICIPAL_MODALITIES = ['CAR', 'MOTO_PASSENGER', 'MOTO_DELIVERY', 'TAXI', 'VAN'] as const;
export type MunicipalModality = (typeof MUNICIPAL_MODALITIES)[number];

export function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, ' ');
}

export function normalizeState(state: string): string {
  return state.trim().toUpperCase();
}

export function mapServiceCategoryToMunicipalModality(serviceCategory: string | null | undefined): MunicipalModality {
  if (!serviceCategory) return 'CAR';
  if (serviceCategory === 'MOTO_PASSENGER') return 'MOTO_PASSENGER';
  if (serviceCategory === 'MOTO_DELIVERY') return 'MOTO_DELIVERY';
  if (serviceCategory.startsWith('MOTO_')) return 'MOTO_PASSENGER';
  if (serviceCategory.startsWith('TAXI')) return 'TAXI';
  return 'CAR';
}

export async function getMunicipalRegulation(city: string, state: string, modality: MunicipalModality) {
  const normalizedCity = normalizeCity(city);
  const normalizedState = normalizeState(state);

  return prisma.municipal_regulations.findFirst({
    where: {
      city: { equals: normalizedCity, mode: 'insensitive' },
      state: { equals: normalizedState, mode: 'insensitive' },
      service_modality: modality,
      is_active: true,
    },
    include: {
      requirements: {
        orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
      },
    },
  });
}

export async function getDriverMunicipalStatus(driverId: string, city: string, state: string, modality: MunicipalModality) {
  const regulation = await getMunicipalRegulation(city, state, modality);
  if (!regulation) {
    return {
      hasRegulation: false,
      city: normalizeCity(city),
      state: normalizeState(state),
      modality,
      requiresCityApproval: false,
      municipalStatus: 'NOT_REQUIRED',
      missingDocumentTypes: [] as string[],
      canOperateMunicipally: true,
      reason: null as string | null,
      authorization: null,
      regulation: null,
    };
  }

  const requiredDocumentTypes = regulation.requirements
    .filter((r) => r.is_required && !!r.document_type)
    .map((r) => String(r.document_type));

  const docs = requiredDocumentTypes.length > 0
    ? await prisma.driver_documents.findMany({
        where: {
          driver_id: driverId,
          type: { in: requiredDocumentTypes },
        },
        select: { type: true, status: true },
      })
    : [];

  const docStatusByType = new Map(docs.map((d) => [d.type, d.status]));
  const missingDocumentTypes = requiredDocumentTypes.filter((docType) => {
    const status = docStatusByType.get(docType);
    return status !== 'SUBMITTED' && status !== 'VERIFIED';
  });

  const authorization = await prisma.municipal_authorizations.findFirst({
    where: {
      driver_id: driverId,
      city: { equals: normalizeCity(city), mode: 'insensitive' },
      state: { equals: normalizeState(state), mode: 'insensitive' },
      service_modality: modality,
    },
    include: {
      regulation: {
        include: {
          requirements: {
            orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          },
        },
      },
    },
  });

  if (regulation.regulation_status === 'REQUIRES_CONFIRMATION') {
    return {
      hasRegulation: true,
      city: normalizeCity(city),
      state: normalizeState(state),
      modality,
      requiresCityApproval: regulation.requires_city_approval,
      municipalStatus: 'REQUIRES_CONFIRMATION',
      missingDocumentTypes,
      canOperateMunicipally: false,
      reason: 'A modalidade nesta cidade exige confirmação formal da Prefeitura.',
      authorization,
      regulation,
    };
  }

  if (!authorization) {
    return {
      hasRegulation: true,
      city: normalizeCity(city),
      state: normalizeState(state),
      modality,
      requiresCityApproval: regulation.requires_city_approval,
      municipalStatus: 'NOT_STARTED',
      missingDocumentTypes,
      canOperateMunicipally: false,
      reason: 'Regularização municipal ainda não iniciada.',
      authorization: null,
      regulation,
    };
  }

  const now = new Date();
  const hasValidAuthorization =
    authorization.status === 'APPROVED_BY_CITY_HALL' &&
    !!authorization.approved_by_admin_id &&
    (!authorization.authorization_valid_until || authorization.authorization_valid_until >= now);

  const canOperateMunicipally = regulation.requires_city_approval
    ? hasValidAuthorization
    : missingDocumentTypes.length === 0;

  let reason: string | null = null;
  if (regulation.requires_city_approval && !hasValidAuthorization) {
    reason = 'Aguardando autorização municipal aprovada e válida.';
  } else if (missingDocumentTypes.length > 0) {
    reason = 'Documentos municipais pendentes.';
  }

  return {
    hasRegulation: true,
    city: normalizeCity(city),
    state: normalizeState(state),
    modality,
    requiresCityApproval: regulation.requires_city_approval,
    municipalStatus: authorization.status,
    missingDocumentTypes,
    canOperateMunicipally,
    reason,
    authorization,
    regulation,
  };
}

export async function canDriverOperateInMunicipality(driverId: string, city: string, state: string, modality: MunicipalModality) {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { id: true, status: true },
  });

  if (!driver) {
    return { allowed: false, reason: 'Motorista não encontrado.' };
  }

  const normalizedDriverStatus = String(driver.status || '').toLowerCase();
  if (!['approved', 'active'].includes(normalizedDriverStatus)) {
    return { allowed: false, reason: 'Motorista ainda não aprovado pela KAVIAR.' };
  }

  const municipal = await getDriverMunicipalStatus(driverId, city, state, modality);
  if (!municipal.canOperateMunicipally) {
    return {
      allowed: false,
      reason: municipal.reason || 'Regularização municipal pendente.',
      municipal,
    };
  }

  return {
    allowed: true,
    reason: null,
    municipal,
  };
}
