import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { requireTerritoryScope } from '../middlewares/require-territory-scope';
import { audit, auditCtx } from '../utils/audit';

const router = Router();

// Apenas TERRITORIAL_MANAGER (e SUPER_ADMIN para testes/debug)
router.use(authenticateAdmin);
router.use(requireRole(['TERRITORIAL_MANAGER', 'SUPER_ADMIN']));
router.use(applyTerritoryScope);
router.use(requireTerritoryScope);

// ─── POST /api/admin/manager/partners/draft ──────────────────────────────────
router.post('/partners/draft', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    // Resolver territory_id do scope (ignora qualquer territory_id vindo do body)
    const territoryIds = scope?.territoryIds || [];
    if (territoryIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Sem território vinculado' });
    }
    const territoryId = territoryIds[0]; // usa primeiro território vinculado

    const { name, partner_type, responsible_name, responsible_role, phone, email, address, notes } = req.body;

    if (!name || !responsible_name) {
      return res.status(400).json({ success: false, error: 'Nome do parceiro e nome do responsável são obrigatórios' });
    }

    const VALID_TYPES = ['association', 'condominium', 'business', 'community_leader', 'institution', 'other'];
    const type = VALID_TYPES.includes(partner_type) ? partner_type : 'other';

    // Criar parceiro como INATIVO (pendente para aprovação SA)
    const partner = await prisma.territorial_partners.create({
      data: {
        name: name.trim(),
        partner_type: type,
        responsible_name: responsible_name.trim(),
        responsible_role: (responsible_role || 'responsável').trim(),
        responsible_phone: phone?.trim() || null,
        responsible_email: email?.trim() || null,
        address: address?.trim() || null,
        status: 'inactive',
        territory_id: territoryId,
        notes: buildNotes(notes, admin),
        // Campos financeiros forçados como padrão (gestor não define)
        commission_percent: 0,
        billing_status: 'current',
        plan: 'basic',
        contract_status: 'pending',
      },
    });

    // Audit log
    const ctx = auditCtx(req);
    audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'manager_draft_partner',
      entityType: 'territorial_partner',
      entityId: partner.id,
      newValue: { name: partner.name, partner_type: type, territory_id: territoryId, submitted_by: admin.id, role: admin.role },
      ipAddress: ctx.ip,
    });

    res.status(201).json({ success: true, data: { id: partner.id, name: partner.name, status: partner.status } });
  } catch (error: any) {
    console.error('[MANAGER_DRAFT_PARTNER]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao cadastrar parceiro' });
  }
});

// ─── POST /api/admin/manager/operators/draft ─────────────────────────────────
router.post('/operators/draft', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    const territoryIds = scope?.territoryIds || [];
    if (territoryIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Sem território vinculado' });
    }

    // Resolver city do território
    const territory = await prisma.operational_territories.findUnique({
      where: { id: territoryIds[0] },
      select: { city_name: true, name: true },
    });
    const city = territory?.city_name || null;

    const { organization_name, responsible_name, responsible_role, phone, email, neighborhood, notes } = req.body;

    if (!organization_name || !responsible_name || !responsible_role) {
      return res.status(400).json({ success: false, error: 'Nome da entidade, nome do responsável e cargo são obrigatórios' });
    }

    const operator = await prisma.local_operators.create({
      data: {
        organization_name: organization_name.trim(),
        responsible_name: responsible_name.trim(),
        responsible_role: responsible_role.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city,
        source: 'territorial_manager',
        status: 'researching',
        notes: buildNotes(notes, admin),
      },
    });

    const ctx = auditCtx(req);
    audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'manager_draft_operator',
      entityType: 'local_operator',
      entityId: operator.id,
      newValue: { organization_name: operator.organization_name, city, submitted_by: admin.id, role: admin.role },
      ipAddress: ctx.ip,
    });

    res.status(201).json({ success: true, data: { id: operator.id, organization_name: operator.organization_name, status: operator.status } });
  } catch (error: any) {
    console.error('[MANAGER_DRAFT_OPERATOR]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao cadastrar associação/operador' });
  }
});

// ─── GET /api/admin/manager/drafts ───────────────────────────────────────────
router.get('/drafts', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const territoryIds = scope?.territoryIds || [];

    if (territoryIds.length === 0) {
      return res.json({ success: true, data: { partners: [], operators: [] } });
    }

    // Parceiros pendentes do território do gestor
    const partners = await prisma.territorial_partners.findMany({
      where: { territory_id: { in: territoryIds }, status: 'inactive' },
      select: { id: true, name: true, partner_type: true, responsible_name: true, responsible_phone: true, status: true, notes: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Operadores/associações cadastrados pelo gestor (source = territorial_manager + city match)
    const territory = await prisma.operational_territories.findMany({
      where: { id: { in: territoryIds } },
      select: { city_name: true },
    });
    const cityNames = territory.map(t => t.city_name).filter(Boolean) as string[];

    const operators = await prisma.local_operators.findMany({
      where: {
        source: 'territorial_manager',
        ...(cityNames.length > 0 ? { city: { in: cityNames, mode: 'insensitive' as const } } : {}),
      },
      select: { id: true, organization_name: true, responsible_name: true, responsible_role: true, phone: true, status: true, notes: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: { partners, operators } });
  } catch (error: any) {
    console.error('[MANAGER_DRAFTS_LIST]', error.message);
    res.status(500).json({ success: false, error: 'Erro ao listar cadastros pendentes' });
  }
});

// ─── Helper ──────────────────────────────────────────────────────────────────
function buildNotes(userNotes: string | undefined, admin: any): string {
  const prefix = `[Cadastrado por ${admin.name} (${admin.role}) em ${new Date().toISOString().split('T')[0]}]`;
  return userNotes ? `${prefix} ${userNotes.trim()}` : prefix;
}

export default router;
