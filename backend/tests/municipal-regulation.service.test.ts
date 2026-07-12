import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    municipal_regulations: { findFirst: vi.fn(), findMany: vi.fn() },
    driver_documents: { findMany: vi.fn() },
    municipal_authorizations: { findFirst: vi.fn() },
    drivers: { findUnique: vi.fn() },
    municipal_regulatory_driver_protocols: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../src/lib/prisma';
import {
  canDriverOperateInMunicipality,
  evaluateDriverRegulatoryCompatibility,
  getDriverMunicipalStatus,
  getMunicipalRegulation,
} from '../src/services/municipal-regulation.service';

const mockFindRegulation = prisma.municipal_regulations.findFirst as ReturnType<typeof vi.fn>;
const mockFindRegulations = prisma.municipal_regulations.findMany as ReturnType<typeof vi.fn>;
const mockFindDocuments = prisma.driver_documents.findMany as ReturnType<typeof vi.fn>;
const mockFindAuthorization = prisma.municipal_authorizations.findFirst as ReturnType<typeof vi.fn>;
const mockFindDriver = prisma.drivers.findUnique as ReturnType<typeof vi.fn>;
const mockFindExistingProtocol = prisma.municipal_regulatory_driver_protocols.findFirst as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockFindRegulations.mockResolvedValue([]);
  mockFindDocuments.mockResolvedValue([]);
  mockFindExistingProtocol.mockResolvedValue(null);
});

describe('municipal regulation service', () => {
  it('getMunicipalRegulation retorna regra ativa da cidade/modalidade', async () => {
    mockFindRegulation.mockResolvedValue({ id: 'reg-1', city: 'Santa Rita do Passa Quatro', state: 'SP', service_modality: 'CAR', requirements: [] });

    const result = await getMunicipalRegulation('Santa Rita do Passa Quatro', 'sp', 'CAR');

    expect(result?.id).toBe('reg-1');
    expect(mockFindRegulation).toHaveBeenCalled();
  });

  it('getDriverMunicipalStatus retorna NOT_REQUIRED quando não há regra ativa', async () => {
    mockFindRegulation.mockResolvedValue(null);

    const result = await getDriverMunicipalStatus('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(result.hasRegulation).toBe(false);
    expect(result.canOperateMunicipally).toBe(true);
    expect(result.municipalStatus).toBe('NOT_REQUIRED');
  });

  it('getDriverMunicipalStatus bloqueia quando status da regra é REQUIRES_CONFIRMATION', async () => {
    mockFindRegulation.mockResolvedValue({
      id: 'reg-2',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'MOTO_PASSENGER',
      regulation_status: 'REQUIRES_CONFIRMATION',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindAuthorization.mockResolvedValue(null);

    const result = await getDriverMunicipalStatus('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'MOTO_PASSENGER');

    expect(result.hasRegulation).toBe(true);
    expect(result.canOperateMunicipally).toBe(false);
    expect(result.municipalStatus).toBe('REQUIRES_CONFIRMATION');
  });

  it('canDriverOperateInMunicipality bloqueia motorista não aprovado pela KAVIAR', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'pending' });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/KAVIAR/i);
  });

  it('canDriverOperateInMunicipality bloqueia quando autorização municipal ainda não está aprovada', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindDocuments.mockResolvedValue([]);
    mockFindAuthorization.mockResolvedValue({
      id: 'auth-1',
      status: 'DOCUMENTS_PENDING',
      authorization_valid_until: null,
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/autorização municipal/i);
  });

  it('canDriverOperateInMunicipality libera mesmo com documentos municipais pendentes quando aprovação final foi confirmada por Admin', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [
        {
          id: 'req-1',
          requirement_key: 'CNH_B_EAR',
          label: 'CNH categoria B ou superior com EAR',
          description: null,
          document_type: 'CNH',
          is_required: true,
          applies_when: null,
          sort_order: 1,
        },
        {
          id: 'req-2',
          requirement_key: 'PROFILE_PHOTO',
          label: '2 fotos 3x4 ou foto padrão documento',
          description: null,
          document_type: 'PROFILE_PHOTO',
          is_required: true,
          applies_when: null,
          sort_order: 2,
        },
      ],
    });
    mockFindDocuments.mockResolvedValue([]);

    mockFindAuthorization.mockResolvedValue({
      id: 'auth-2',
      status: 'APPROVED_BY_CITY_HALL',
      authorization_valid_until: null,
      approved_by_admin_id: 'admin-1',
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.municipal?.missingDocumentTypes).toEqual(['CNH', 'PROFILE_PHOTO']);
  });

  it('canDriverOperateInMunicipality não libera aprovação sem confirmação do Admin', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'approved' });
    mockFindRegulation.mockResolvedValue({
      id: 'reg-1',
      city: 'Santa Rita do Passa Quatro',
      state: 'SP',
      service_modality: 'CAR',
      regulation_status: 'REGULATED',
      requires_city_approval: true,
      requirements: [],
    });
    mockFindDocuments.mockResolvedValue([]);
    mockFindAuthorization.mockResolvedValue({
      id: 'auth-3',
      status: 'APPROVED_BY_CITY_HALL',
      authorization_valid_until: null,
      approved_by_admin_id: null,
      regulation: {
        id: 'reg-1',
        requires_city_approval: true,
        requirements: [],
      },
    });

    const result = await canDriverOperateInMunicipality('driver-1', 'Santa Rita do Passa Quatro', 'SP', 'CAR');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/autorização municipal/i);
  });

  it('canDriverOperateInMunicipality aceita status APPROVED/ACTIVE em caixa alta', async () => {
    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'APPROVED' });
    mockFindRegulation.mockResolvedValue(null);

    const resultApproved = await canDriverOperateInMunicipality('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(resultApproved.allowed).toBe(true);

    mockFindDriver.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    const resultActive = await canDriverOperateInMunicipality('driver-1', 'Cidade Livre', 'SP', 'CAR');

    expect(resultActive.allowed).toBe(true);
  });

  it('avalia COMPATIBLE para motorista aprovado da mesma cidade com modalidade e documentos mínimos', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [
          { is_required: true, document_type: 'CNH' },
          { is_required: true, document_type: 'CRLV' },
        ],
      },
    ]);
    mockFindDocuments.mockResolvedValue([
      { type: 'CNH', status: 'SUBMITTED' },
      { type: 'CRLV', status: 'VERIFIED' },
    ]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('COMPATIBLE');
    expect(result.compatible).toBe(true);
    expect(result.cityMatch).toBe(true);
    expect(result.approvedModalities).toEqual(['CAR']);
    expect(result.compatibleModalities).toEqual(['CAR']);
    expect(result.documentSummary.required).toBe(2);
    expect(result.documentSummary.submitted).toBe(1);
    expect(result.documentSummary.verified).toBe(1);
    expect(result.documentSummary.missing).toBe(0);
  });

  it('retorna INCOMPATIBLE quando motorista está vinculado a outra cidade', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Campinas',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([{ service_modality: 'CAR', requirements: [] }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.reasons).toContain('Motorista vinculado a outra cidade.');
  });

  it('retorna REVIEW_REQUIRED quando cidade/UF do motorista não podem ser resolvidas', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: null,
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([{ service_modality: 'CAR', requirements: [] }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.cityMatch).toBe(false);
    expect(result.reasons).toContain('Cidade do motorista não pôde ser confirmada pelo cadastro KAVIAR.');
  });

  it('retorna INCOMPATIBLE quando não há modalidade aprovada', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [],
    });

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.reasons).toContain('Motorista não possui modalidade aprovada pela KAVIAR.');
  });

  it('não considera modalidade PENDING_REVIEW como aprovada', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'PENDING_REVIEW' }],
    });

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.approvedModalities).toEqual([]);
    expect(result.status).toBe('INCOMPATIBLE');
  });

  it('não considera modalidade REJECTED como aprovada', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'REJECTED' }],
    });

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.approvedModalities).toEqual([]);
    expect(result.status).toBe('INCOMPATIBLE');
  });

  it('conta documento SUBMITTED como disponível para criação inicial do protocolo', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [{ is_required: true, document_type: 'CNH' }],
      },
    ]);
    mockFindDocuments.mockResolvedValue([{ type: 'CNH', status: 'SUBMITTED' }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('COMPATIBLE');
    expect(result.documentSummary.submitted).toBe(1);
    expect(result.documentSummary.missing).toBe(0);
  });

  it('conta documento VERIFIED como disponível para criação inicial do protocolo', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [{ is_required: true, document_type: 'CNH' }],
      },
    ]);
    mockFindDocuments.mockResolvedValue([{ type: 'CNH', status: 'VERIFIED' }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('COMPATIBLE');
    expect(result.documentSummary.verified).toBe(1);
    expect(result.documentSummary.missing).toBe(0);
  });

  it('retorna INCOMPATIBLE quando há documento obrigatório ausente', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [
          { is_required: true, document_type: 'CNH' },
          { is_required: true, document_type: 'CRLV' },
        ],
      },
    ]);
    mockFindDocuments.mockResolvedValue([{ type: 'CNH', status: 'SUBMITTED' }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.reasons).toContain('Motorista possui documentos obrigatórios pendentes para esta cidade.');
    expect(result.documentSummary.missing).toBe(1);
    expect(result.documentSummary.missingDocumentTypes).toEqual(['CRLV']);
  });

  it('não bloqueia por requisito opcional', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [
          { is_required: false, document_type: 'PHOTO' },
          { is_required: true, document_type: 'CNH' },
        ],
      },
    ]);
    mockFindDocuments.mockResolvedValue([{ type: 'CNH', status: 'SUBMITTED' }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('COMPATIBLE');
    expect(result.documentSummary.required).toBe(1);
  });

  it('não inclui no resumo requisito obrigatório sem document_type', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([
      {
        service_modality: 'CAR',
        requirements: [
          { is_required: true, document_type: null },
          { is_required: true, document_type: 'CNH' },
        ],
      },
    ]);
    mockFindDocuments.mockResolvedValue([{ type: 'CNH', status: 'SUBMITTED' }]);

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.documentSummary.required).toBe(1);
    expect(result.documentSummary.missing).toBe(0);
    expect(result.status).toBe('COMPATIBLE');
  });

  it('retorna INCOMPATIBLE quando protocolo já existe para case_id + driver_id', async () => {
    mockFindDriver.mockResolvedValue({
      neighborhoods: {
        city: 'Santa Rita do Passa Quatro',
        territory: { uf: 'SP' },
      },
      driver_modalities: [{ modality: 'CAR', status: 'APPROVED' }],
    });
    mockFindRegulations.mockResolvedValue([{ service_modality: 'CAR', requirements: [] }]);
    mockFindExistingProtocol.mockResolvedValue({ id: 'protocol-1' });

    const result = await evaluateDriverRegulatoryCompatibility('driver-1', 'Santa Rita do Passa Quatro', 'SP', { caseId: 'case-1' });

    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.reasons).toContain('Este motorista já possui protocolo nesta cidade.');
  });
});
