import { prisma } from '../lib/prisma';

export const MUNICIPAL_MODALITIES = ['CAR', 'MOTO_PASSENGER', 'MOTO_DELIVERY', 'TAXI', 'VAN'] as const;
export type MunicipalModality = (typeof MUNICIPAL_MODALITIES)[number];
export type DriverRegulatoryCompatibilityStatus = 'COMPATIBLE' | 'INCOMPATIBLE' | 'REVIEW_REQUIRED';

export type DriverRegulatoryDocumentSummary = {
  required: number;
  submitted: number;
  verified: number;
  missing: number;
  missingDocumentTypes: string[];
};

export type DriverRegulatoryCompatibility = {
  compatible: boolean;
  status: DriverRegulatoryCompatibilityStatus;
  reasons: string[];
  cityMatch: boolean;
  approvedModalities: MunicipalModality[];
  compatibleModalities: MunicipalModality[];
  documentSummary: DriverRegulatoryDocumentSummary;
};

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

export function mapDriverModalityToMunicipalModality(modality: string | null | undefined): MunicipalModality | null {
  if (!modality) return null;
  const normalized = modality.trim().toUpperCase();

  if ((MUNICIPAL_MODALITIES as readonly string[]).includes(normalized)) {
    return normalized as MunicipalModality;
  }

  if (normalized === 'CAR_PASSENGER' || normalized.startsWith('CAR')) return 'CAR';
  if (normalized === 'MOTO_DELIVERY' || normalized.startsWith('MOTO_DELIVERY')) return 'MOTO_DELIVERY';
  if (normalized === 'MOTO_PASSENGER' || normalized.startsWith('MOTO_PASSENGER') || normalized.startsWith('MOTO_')) {
    return 'MOTO_PASSENGER';
  }
  if (normalized === 'TAXI' || normalized.startsWith('TAXI')) return 'TAXI';
  if (normalized === 'VAN' || normalized.startsWith('VAN')) return 'VAN';

  return null;
}

type RegulationWithRequirements = {
  service_modality: MunicipalModality;
  requirements: Array<{
    is_required: boolean;
    document_type: string | null;
  }>;
};

type DriverDocumentStatusItem = {
  type: string;
  status: string | null;
};

type EvaluateCompatibilitySnapshotInput = {
  caseCity: string;
  caseState: string;
  driverCity: string | null;
  driverState: string | null;
  approvedModalities: MunicipalModality[];
  regulationsByModality: Map<MunicipalModality, RegulationWithRequirements | null>;
  driverDocuments: DriverDocumentStatusItem[];
  alreadyLinked: boolean;
};

type EvaluateCompatibilityOptions = {
  caseId?: string;
  preloaded?: {
    driverCity?: string | null;
    driverState?: string | null;
    approvedModalities?: MunicipalModality[];
    regulationsByModality?: Map<MunicipalModality, RegulationWithRequirements | null>;
    driverDocuments?: DriverDocumentStatusItem[];
    alreadyLinked?: boolean;
  };
};

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function getRequiredDocumentTypes(requirements: Array<{ is_required: boolean; document_type: string | null }>): string[] {
  const unique = new Set<string>();

  for (const requirement of requirements) {
    if (!requirement.is_required) continue;
    const type = String(requirement.document_type || '').trim();
    if (!type) continue;
    unique.add(type);
  }

  return Array.from(unique);
}

function buildDocumentSummary(
  requirements: Array<{ is_required: boolean; document_type: string | null }>,
  driverDocuments: DriverDocumentStatusItem[],
): DriverRegulatoryDocumentSummary {
  const requiredDocumentTypes = getRequiredDocumentTypes(requirements);
  const requiredByNormalizedType = new Map<string, string>();

  for (const type of requiredDocumentTypes) {
    requiredByNormalizedType.set(type.toUpperCase(), type);
  }

  const statusByRequiredType = new Map<string, string>();
  for (const document of driverDocuments) {
    const normalizedType = String(document.type || '').trim().toUpperCase();
    const requiredType = requiredByNormalizedType.get(normalizedType);
    if (!requiredType) continue;
    statusByRequiredType.set(requiredType, normalizeStatus(document.status));
  }

  let submitted = 0;
  let verified = 0;
  const missingDocumentTypes: string[] = [];

  for (const type of requiredDocumentTypes) {
    const status = statusByRequiredType.get(type);
    if (status === 'VERIFIED') {
      verified += 1;
      continue;
    }

    if (status === 'SUBMITTED') {
      submitted += 1;
      continue;
    }

    missingDocumentTypes.push(type);
  }

  return {
    required: requiredDocumentTypes.length,
    submitted,
    verified,
    missing: missingDocumentTypes.length,
    missingDocumentTypes,
  };
}

function evaluateDriverRegulatoryCompatibilitySnapshot(input: EvaluateCompatibilitySnapshotInput): DriverRegulatoryCompatibility {
  const reasons: string[] = [];
  const caseCity = normalizeCity(input.caseCity);
  const caseState = normalizeState(input.caseState);
  const approvedModalities = Array.from(new Set(input.approvedModalities));

  const setReviewRequired = (reason: string) => {
    addReason(reasons, reason);
    if (status !== 'INCOMPATIBLE') {
      status = 'REVIEW_REQUIRED';
    }
  };

  const setIncompatible = (reason: string) => {
    addReason(reasons, reason);
    status = 'INCOMPATIBLE';
  };

  let cityMatch = false;
  let status: DriverRegulatoryCompatibilityStatus = 'COMPATIBLE';

  const hasDriverCity = typeof input.driverCity === 'string' && input.driverCity.trim().length > 0;
  const hasDriverState = typeof input.driverState === 'string' && input.driverState.trim().length > 0;

  if (!hasDriverCity || !hasDriverState) {
    setReviewRequired('Cidade do motorista não pôde ser confirmada pelo cadastro KAVIAR.');
  } else {
    const normalizedDriverCity = normalizeCity(String(input.driverCity));
    const normalizedDriverState = normalizeState(String(input.driverState));

    cityMatch = normalizedDriverCity.toLowerCase() === caseCity.toLowerCase() && normalizedDriverState === caseState;
    if (!cityMatch) {
      setIncompatible('Motorista vinculado a outra cidade.');
    }
  }

  if (approvedModalities.length === 0) {
    setIncompatible('Motorista não possui modalidade aprovada pela KAVIAR.');
  }

  const regulations = approvedModalities
    .map((modality) => ({ modality, regulation: input.regulationsByModality.get(modality) || null }))
    .filter((item) => Boolean(item.regulation));

  const evaluatedModalities = regulations.map((item) => item.modality);
  if (approvedModalities.length > 0 && evaluatedModalities.length === 0) {
    setReviewRequired('Não foi possível avaliar modalidades aprovadas para esta cidade com segurança.');
  }

  const combinedRequirements = regulations.flatMap((item) => item.regulation?.requirements || []);
  const documentSummary = buildDocumentSummary(combinedRequirements, input.driverDocuments);

  const compatibleModalities = regulations
    .filter((item) => {
      const summary = buildDocumentSummary(item.regulation?.requirements || [], input.driverDocuments);
      return summary.missing === 0;
    })
    .map((item) => item.modality);

  if (evaluatedModalities.length > 0 && compatibleModalities.length === 0) {
    if (documentSummary.missing > 0) {
      setIncompatible('Motorista possui documentos obrigatórios pendentes para esta cidade.');
    } else {
      setReviewRequired('Não foi possível concluir compatibilidade de modalidade para esta cidade.');
    }
  }

  if (input.alreadyLinked) {
    setIncompatible('Este motorista já possui protocolo nesta cidade.');
  }

  return {
    compatible: status === 'COMPATIBLE',
    status,
    reasons,
    cityMatch,
    approvedModalities,
    compatibleModalities,
    documentSummary,
  };
}

export async function evaluateDriverRegulatoryCompatibility(
  driverId: string,
  city: string,
  state: string,
  options: EvaluateCompatibilityOptions = {},
): Promise<DriverRegulatoryCompatibility> {
  const preloaded = options.preloaded || {};

  let driverCity = preloaded.driverCity;
  let driverState = preloaded.driverState;
  let approvedModalities = preloaded.approvedModalities;

  if (!approvedModalities || driverCity === undefined || driverState === undefined) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        neighborhoods: {
          select: {
            city: true,
            territory: {
              select: {
                uf: true,
              },
            },
          },
        },
        driver_modalities: {
          select: {
            modality: true,
            status: true,
          },
        },
      },
    });

    const approved = (driver?.driver_modalities || [])
      .filter((item) => normalizeStatus(item.status) === 'APPROVED')
      .map((item) => mapDriverModalityToMunicipalModality(item.modality))
      .filter((value): value is MunicipalModality => Boolean(value));

    approvedModalities = approvedModalities || Array.from(new Set(approved));
    if (driverCity === undefined) {
      driverCity = driver?.neighborhoods?.city || null;
    }
    if (driverState === undefined) {
      driverState = driver?.neighborhoods?.territory?.uf || null;
    }
  }

  const uniqueApprovedModalities = Array.from(new Set(approvedModalities || []));

  let regulationsByModality = preloaded.regulationsByModality;
  if (!regulationsByModality) {
    regulationsByModality = new Map<MunicipalModality, RegulationWithRequirements | null>();
    if (uniqueApprovedModalities.length > 0) {
      const regulations = await prisma.municipal_regulations.findMany({
        where: {
          city: { equals: normalizeCity(city), mode: 'insensitive' },
          state: { equals: normalizeState(state), mode: 'insensitive' },
          is_active: true,
          service_modality: { in: uniqueApprovedModalities },
        },
        include: {
          requirements: {
            orderBy: [{ sort_order: 'asc' }, { label: 'asc' }],
          },
        },
      });

      const byModality = new Map(regulations.map((regulation) => [regulation.service_modality as MunicipalModality, regulation]));
      for (const modality of uniqueApprovedModalities) {
        regulationsByModality.set(modality, byModality.get(modality) || null);
      }
    }
  }

  let driverDocuments = preloaded.driverDocuments;
  if (!driverDocuments) {
    const requirements = Array.from(regulationsByModality.values())
      .filter((regulation): regulation is RegulationWithRequirements => Boolean(regulation))
      .flatMap((regulation) => regulation.requirements);

    const requiredDocumentTypes = getRequiredDocumentTypes(requirements);
    if (requiredDocumentTypes.length > 0) {
      driverDocuments = await prisma.driver_documents.findMany({
        where: {
          driver_id: driverId,
          type: { in: requiredDocumentTypes },
        },
        select: {
          type: true,
          status: true,
        },
      });
    } else {
      driverDocuments = [];
    }
  }

  let alreadyLinked = preloaded.alreadyLinked;
  if (alreadyLinked === undefined && options.caseId) {
    const existingProtocol = await prisma.municipal_regulatory_driver_protocols.findFirst({
      where: {
        case_id: options.caseId,
        driver_id: driverId,
      },
      select: { id: true },
    });

    alreadyLinked = Boolean(existingProtocol);
  }

  return evaluateDriverRegulatoryCompatibilitySnapshot({
    caseCity: city,
    caseState: state,
    driverCity: driverCity || null,
    driverState: driverState || null,
    approvedModalities: uniqueApprovedModalities,
    regulationsByModality,
    driverDocuments: driverDocuments || [],
    alreadyLinked: Boolean(alreadyLinked),
  });
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
