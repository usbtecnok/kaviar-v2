import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';

const router = Router();
router.use(authenticateAdmin, requireSuperAdmin);

function maskPix(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return '***';
  return key.substring(0, 3) + '***' + key.substring(key.length - 3);
}

function maskCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  return '***' + cpf.slice(-4);
}

// ─── Operator Profiles ───────────────────────────────────────────────────────

router.get('/operators', async (_req: Request, res: Response) => {
  try {
    const operators = await prisma.operator_profiles.findMany({
      include: { admin: { select: { name: true, email: true } }, territory: { select: { id: true, name: true, level: true } } },
      orderBy: { created_at: 'desc' },
    });
    const masked = operators.map(o => ({ ...o, pix_key: maskPix(o.pix_key), document_cpf: maskCpf(o.document_cpf), legal_representative_cpf: maskCpf(o.legal_representative_cpf) }));
    res.json({ success: true, data: masked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar operadores' });
  }
});

router.get('/operators/:id', async (req: Request, res: Response) => {
  try {
    const op = await prisma.operator_profiles.findUnique({
      where: { id: req.params.id },
      include: { admin: { select: { name: true, email: true } }, territory: { select: { id: true, name: true } }, payouts: { orderBy: { created_at: 'desc' }, take: 10 } },
    });
    if (!op) return res.status(404).json({ success: false, error: 'Operador não encontrado' });
    res.json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar operador' });
  }
});

const emptyToNull = z.string().optional().nullable().transform(v => v === '' ? null : v);
const optionalEmail = z.string().optional().nullable().transform(v => v === '' ? null : v).refine(v => v === null || v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Invalid email' });

const createOperatorSchema = z.object({
  admin_id: z.string().min(1),
  territory_id: z.string().min(1),
  recipient_type: z.enum(['individual', 'company', 'association']),
  relationship_type: z.enum(['territorial_operator', 'association_partner', 'consultant']).default('territorial_operator'),
  display_name: z.string().min(2),
  email: optionalEmail,
  phone: emptyToNull,
  address: emptyToNull,
  pix_key: emptyToNull,
  pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional().nullable(),
  bank_name: emptyToNull,
  full_name: emptyToNull,
  document_cpf: emptyToNull,
  document_rg: emptyToNull,
  company_name: emptyToNull,
  trade_name: emptyToNull,
  document_cnpj: emptyToNull,
  legal_representative_name: emptyToNull,
  legal_representative_cpf: emptyToNull,
  notes: emptyToNull,
});

router.post('/operators', async (req: Request, res: Response) => {
  try {
    const data = createOperatorSchema.parse(req.body);

    const admin = await prisma.admins.findUnique({ where: { id: data.admin_id } });
    if (!admin) return res.status(400).json({ success: false, error: 'Admin não encontrado' });

    const territory = await prisma.operational_territories.findUnique({ where: { id: data.territory_id } });
    if (!territory) return res.status(400).json({ success: false, error: 'Território não encontrado' });

    const existing = await prisma.operator_profiles.findUnique({ where: { admin_id: data.admin_id } });
    if (existing) return res.status(409).json({ success: false, error: 'Este admin já possui perfil de operador' });

    const activeInTerritory = await prisma.operator_profiles.findFirst({ where: { territory_id: data.territory_id, is_active: true } });
    if (activeInTerritory) return res.status(409).json({ success: false, error: 'Já existe operador ativo neste território' });

    // Validate required fields by type
    if (data.recipient_type === 'individual' && !data.full_name) return res.status(400).json({ success: false, error: 'Nome completo obrigatório para PF' });
    if (data.recipient_type === 'individual' && !data.document_cpf) return res.status(400).json({ success: false, error: 'CPF obrigatório para PF' });
    if (data.recipient_type === 'company' && !data.company_name) return res.status(400).json({ success: false, error: 'Razão social obrigatória para PJ' });
    if (data.recipient_type === 'company' && !data.document_cnpj) return res.status(400).json({ success: false, error: 'CNPJ obrigatório para PJ' });
    if (data.recipient_type === 'company' && !data.legal_representative_name) return res.status(400).json({ success: false, error: 'Responsável legal obrigatório para PJ' });
    if (data.recipient_type === 'company' && !data.legal_representative_cpf) return res.status(400).json({ success: false, error: 'CPF do responsável legal obrigatório para PJ' });
    if (data.recipient_type === 'association' && !data.company_name) return res.status(400).json({ success: false, error: 'Nome da associação obrigatório' });
    if (data.recipient_type === 'association' && !data.legal_representative_name) return res.status(400).json({ success: false, error: 'Presidente/responsável obrigatório para associação' });
    if (data.recipient_type === 'association' && !data.legal_representative_cpf) return res.status(400).json({ success: false, error: 'CPF do responsável obrigatório para associação' });

    const operator = await prisma.operator_profiles.create({ data: { ...data, email: data.email || null, phone: data.phone || null, address: data.address || null, pix_key: data.pix_key || null, pix_key_type: data.pix_key_type || null, bank_name: data.bank_name || null, full_name: data.full_name || null, document_cpf: data.document_cpf || null, document_rg: data.document_rg || null, company_name: data.company_name || null, trade_name: data.trade_name || null, document_cnpj: data.document_cnpj || null, legal_representative_name: data.legal_representative_name || null, legal_representative_cpf: data.legal_representative_cpf || null, notes: data.notes || null } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'create_operator_profile', entityType: 'operator_profile', entityId: operator.id, newValue: { display_name: data.display_name, recipient_type: data.recipient_type, territory: territory.name }, ipAddress: ctx.ip });

    res.status(201).json({ success: true, data: operator });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ success: false, error: error.errors[0].message });
    res.status(500).json({ success: false, error: 'Erro ao criar operador' });
  }
});

router.patch('/operators/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.operator_profiles.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Operador não encontrado' });

    const { document_status, contract_status, is_active, rejected_reason, ...fields } = req.body;
    const updates: any = {};

    // Field updates
    for (const [k, v] of Object.entries(fields)) {
      if (['display_name', 'email', 'phone', 'address', 'pix_key', 'pix_key_type', 'bank_name', 'full_name', 'document_cpf', 'document_rg', 'company_name', 'trade_name', 'document_cnpj', 'legal_representative_name', 'legal_representative_cpf', 'notes'].includes(k)) {
        updates[k] = v;
      }
    }

    if (document_status === 'verified') {
      updates.document_status = 'verified';
      updates.verified_by = (req as any).admin.id;
      updates.verified_at = new Date();
    } else if (document_status === 'rejected') {
      updates.document_status = 'rejected';
      updates.rejected_reason = rejected_reason || null;
      updates.is_active = false;
    }

    if (contract_status) updates.contract_status = contract_status;

    // Activation logic
    if (is_active === true) {
      if ((updates.document_status || existing.document_status) !== 'verified') return res.status(400).json({ success: false, error: 'Operador precisa estar verificado para ser ativado' });
      const cs = updates.contract_status || existing.contract_status;
      if (cs !== 'signed' && cs !== 'not_required') return res.status(400).json({ success: false, error: 'Contrato precisa estar assinado ou dispensado' });
      if (!existing.pix_key && !updates.pix_key) return res.status(400).json({ success: false, error: 'Pix obrigatório para ativar operador' });
      // Association without CNPJ warning
      if (existing.recipient_type === 'association' && !existing.document_cnpj && cs !== 'signed') return res.status(400).json({ success: false, error: 'Associação sem CNPJ exige aprovação especial da matriz e termo assinado' });
      const activeInTerritory = await prisma.operator_profiles.findFirst({ where: { territory_id: existing.territory_id, is_active: true, id: { not: req.params.id } } });
      if (activeInTerritory) return res.status(409).json({ success: false, error: 'Já existe operador ativo neste território' });
      updates.is_active = true;
    }
    if (is_active === false) updates.is_active = false;

    const operator = await prisma.operator_profiles.update({ where: { id: req.params.id }, data: updates });

    const ctx = auditCtx(req);
    const action = document_status === 'verified' ? 'verify_operator_profile' : document_status === 'rejected' ? 'reject_operator_profile' : 'update_operator_profile';
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action, entityType: 'operator_profile', entityId: req.params.id, newValue: updates, ipAddress: ctx.ip });

    res.json({ success: true, data: operator });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar operador' });
  }
});

// ─── Territory Payouts ───────────────────────────────────────────────────────

router.get('/payouts', async (req: Request, res: Response) => {
  try {
    const { status, territory_id } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (territory_id) where.territory_id = territory_id;

    const payouts = await prisma.territory_payouts.findMany({
      where,
      include: { territory: { select: { name: true } }, operator: { select: { display_name: true, pix_key: true, pix_key_type: true, recipient_type: true } } },
      orderBy: { created_at: 'desc' },
    });
    const masked = payouts.map(p => ({ ...p, operator: { ...p.operator, pix_key: maskPix(p.operator.pix_key) } }));
    res.json({ success: true, data: masked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar repasses' });
  }
});

router.post('/payouts/calculate', async (req: Request, res: Response) => {
  try {
    const { territory_id, reference_month } = req.body;
    if (!territory_id || !reference_month) return res.status(400).json({ success: false, error: 'territory_id e reference_month obrigatórios' });
    if (!/^\d{4}-\d{2}$/.test(reference_month)) return res.status(400).json({ success: false, error: 'reference_month deve ser YYYY-MM' });

    const territory = await prisma.operational_territories.findUnique({ where: { id: territory_id } });
    if (!territory) return res.status(404).json({ success: false, error: 'Território não encontrado' });

    const rule = await prisma.territory_finance_rules.findFirst({ where: { territory_id, is_active: true } });
    if (!rule) return res.status(400).json({ success: false, error: 'Nenhuma regra financeira ativa' });

    const operator = await prisma.operator_profiles.findFirst({ where: { territory_id, is_active: true, document_status: 'verified' } });
    if (!operator) return res.status(400).json({ success: false, error: 'Nenhum operador verificado e ativo' });
    if (!operator.pix_key) return res.status(400).json({ success: false, error: 'Operador sem Pix cadastrado' });

    const existingPayout = await prisma.territory_payouts.findUnique({ where: { territory_id_reference_month: { territory_id, reference_month } } });
    if (existingPayout) return res.status(409).json({ success: false, error: `Repasse já existe para ${reference_month} (status: ${existingPayout.status})` });

    const [year, month] = reference_month.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const nIds = (await prisma.neighborhoods.findMany({ where: { territory_id }, select: { id: true } })).map(n => n.id);
    if (nIds.length === 0) return res.status(400).json({ success: false, error: 'Território sem bairros vinculados' });

    const settlements = await prisma.ride_settlements.aggregate({
      where: { origin_neighborhood_id: { in: nIds }, settled_at: { gte: monthStart, lt: monthEnd, not: null } },
      _sum: { fee_amount: true, final_price: true },
      _count: true,
    });

    const feeTotal = Number(settlements._sum.fee_amount || 0);
    const grossTotal = Number(settlements._sum.final_price || 0);
    const ridesCount = settlements._count;
    const regionalPercent = Number(rule.regional_share_percent);
    const regionalGross = feeTotal * regionalPercent / 100;

    const pIds = (await prisma.territorial_partners.findMany({ where: { territory_id }, select: { id: true } })).map(p => p.id);
    let partnerCommissions = 0;
    if (pIds.length > 0) {
      const comms = await prisma.partner_commissions.aggregate({ where: { partner_id: { in: pIds }, created_at: { gte: monthStart, lt: monthEnd } }, _sum: { commission_amount: true } });
      partnerCommissions = Number(comms._sum.commission_amount || 0);
    }

    const netAmount = Math.round((regionalGross - partnerCommissions) * 100) / 100;

    const payout = await prisma.territory_payouts.create({
      data: {
        territory_id,
        operator_profile_id: operator.id,
        reference_month,
        calculated_amount: netAmount,
        fiscal_document_required: operator.recipient_type === 'company',
        fiscal_document_type: operator.recipient_type === 'company' ? 'nfse' : operator.recipient_type === 'association' ? 'receipt' : 'none',
        calculation_details: { period: reference_month, territory: territory.name, rides_count: ridesCount, gross_total: grossTotal, fee_total: feeTotal, regional_share_percent: regionalPercent, regional_gross: Math.round(regionalGross * 100) / 100, partner_commissions: partnerCommissions, net_regional: netAmount },
      },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'calculate_payout', entityType: 'territory_payout', entityId: payout.id, newValue: { territory: territory.name, month: reference_month, amount: netAmount }, ipAddress: ctx.ip });

    res.status(201).json({ success: true, data: payout });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao calcular repasse' });
  }
});

router.patch('/payouts/:id/approve', async (req: Request, res: Response) => {
  try {
    const payout = await prisma.territory_payouts.findUnique({ where: { id: req.params.id } });
    if (!payout) return res.status(404).json({ success: false, error: 'Repasse não encontrado' });
    if (payout.status !== 'calculated') return res.status(400).json({ success: false, error: `Status "${payout.status}" não permite aprovação` });

    const { approved_amount, notes } = req.body;
    const amount = approved_amount ?? Number(payout.calculated_amount);

    const updated = await prisma.territory_payouts.update({
      where: { id: req.params.id },
      data: { status: 'approved', approved_amount: amount, approved_by: (req as any).admin.id, approved_at: new Date(), notes: notes || payout.notes },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'approve_payout', entityType: 'territory_payout', entityId: req.params.id, newValue: { approved_amount: amount }, ipAddress: ctx.ip });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao aprovar' });
  }
});

router.patch('/payouts/:id/pay', async (req: Request, res: Response) => {
  try {
    const payout = await prisma.territory_payouts.findUnique({ where: { id: req.params.id }, include: { operator: true } });
    if (!payout) return res.status(404).json({ success: false, error: 'Repasse não encontrado' });
    if (payout.status !== 'approved') return res.status(400).json({ success: false, error: `Status "${payout.status}" não permite registro de pagamento` });

    const { payment_method, payment_ref, receipt_url, notes } = req.body;
    if (!payment_ref) return res.status(400).json({ success: false, error: 'payment_ref obrigatório' });

    const updated = await prisma.territory_payouts.update({
      where: { id: req.params.id },
      data: { status: 'paid', paid_by: (req as any).admin.id, paid_at: new Date(), payment_method: payment_method || 'pix', payment_ref, receipt_url: receipt_url || null, notes: notes || payout.notes, ...(req.body.fiscal_document_url && { fiscal_document_url: req.body.fiscal_document_url }), ...(req.body.fiscal_document_ref && { fiscal_document_ref: req.body.fiscal_document_ref }), ...(req.body.fiscal_notes && { fiscal_notes: req.body.fiscal_notes }) },
    });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'pay_payout', entityType: 'territory_payout', entityId: req.params.id, newValue: { payment_method: payment_method || 'pix', payment_ref }, ipAddress: ctx.ip });

    res.json({ success: true, data: { ...updated, operator_pix: payout.operator.pix_key, operator_name: payout.operator.display_name } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao registrar pagamento' });
  }
});

router.patch('/payouts/:id/cancel', async (req: Request, res: Response) => {
  try {
    const payout = await prisma.territory_payouts.findUnique({ where: { id: req.params.id } });
    if (!payout) return res.status(404).json({ success: false, error: 'Repasse não encontrado' });
    if (payout.status === 'paid') return res.status(400).json({ success: false, error: 'Repasse pago não pode ser cancelado' });
    if (payout.status === 'canceled') return res.status(400).json({ success: false, error: 'Já cancelado' });

    const { cancel_reason } = req.body;
    if (!cancel_reason) return res.status(400).json({ success: false, error: 'Motivo obrigatório' });

    const updated = await prisma.territory_payouts.update({ where: { id: req.params.id }, data: { status: 'canceled', cancel_reason } });

    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'cancel_payout', entityType: 'territory_payout', entityId: req.params.id, newValue: { cancel_reason }, ipAddress: ctx.ip });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao cancelar' });
  }
});

export default router;
