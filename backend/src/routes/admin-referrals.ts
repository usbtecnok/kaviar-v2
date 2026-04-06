import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// === REFERRAL AGENTS ===

// GET /api/admin/referral-agents
router.get('/referral-agents', async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.referral_agents.findMany({
      include: { referrals: { select: { id: true, status: true, payment_status: true } } },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: agents });
  } catch (err) {
    console.error('[REFERRAL_AGENTS] list error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar indicadores' });
  }
});

// POST /api/admin/referral-agents
router.post('/referral-agents', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, pix_key, pix_key_type } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, error: 'Nome e telefone obrigatórios' });

    const existing = await prisma.referral_agents.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ success: false, error: 'Telefone já cadastrado' });

    const agent = await prisma.referral_agents.create({
      data: { name, phone, email, pix_key, pix_key_type },
    });
    return res.json({ success: true, data: agent });
  } catch (err) {
    console.error('[REFERRAL_AGENTS] create error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar indicador' });
  }
});

// PATCH /api/admin/referral-agents/:id
router.patch('/referral-agents/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, pix_key, pix_key_type, is_active } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (pix_key !== undefined) data.pix_key = pix_key;
    if (pix_key_type !== undefined) data.pix_key_type = pix_key_type;
    if (is_active !== undefined) data.is_active = is_active;

    const agent = await prisma.referral_agents.update({ where: { id: req.params.id }, data });

    // Auto-transition: pending_pix → pending_approval when PIX is set
    if (pix_key) {
      await prisma.referrals.updateMany({
        where: { agent_id: agent.id, status: 'qualified', payment_status: 'pending_pix' },
        data: { payment_status: 'pending_approval', updated_at: new Date() },
      });
    }

    return res.json({ success: true, data: agent });
  } catch (err) {
    console.error('[REFERRAL_AGENTS] update error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar indicador' });
  }
});

// === REFERRALS ===

// GET /api/admin/referrals
router.get('/referrals', async (req: Request, res: Response) => {
  try {
    const { status, payment_status, has_pix, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (search) {
      const s = String(search);
      where.OR = [
        { driver_phone: { contains: s } },
        { agent: { name: { contains: s, mode: 'insensitive' } } },
        { agent: { phone: { contains: s } } },
      ];
    }

    const referrals = await prisma.referrals.findMany({
      where,
      include: { agent: { select: { id: true, name: true, phone: true, pix_key: true, pix_key_type: true } } },
      orderBy: { created_at: 'desc' },
    });

    let filtered = referrals;
    if (has_pix === 'true') filtered = referrals.filter(r => r.agent.pix_key);
    if (has_pix === 'false') filtered = referrals.filter(r => !r.agent.pix_key);

    // Enrich with driver name
    const driverIds = filtered.map(r => r.driver_id).filter(Boolean) as string[];
    const drivers = driverIds.length > 0
      ? await prisma.drivers.findMany({ where: { id: { in: driverIds } }, select: { id: true, name: true, status: true } })
      : [];
    const driverMap = new Map(drivers.map(d => [d.id, d]));

    const enriched = filtered.map(r => ({
      ...r,
      driver: r.driver_id ? driverMap.get(r.driver_id) || null : null,
    }));

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[REFERRALS] list error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar indicações' });
  }
});

// POST /api/admin/referrals
router.post('/referrals', async (req: Request, res: Response) => {
  try {
    const { agent_id, driver_phone, driver_id, lead_id, reward_amount } = req.body;
    if (!agent_id || !driver_phone) return res.status(400).json({ success: false, error: 'agent_id e driver_phone obrigatórios' });

    const existing = await prisma.referrals.findUnique({ where: { driver_phone } });
    if (existing) return res.status(409).json({ success: false, error: 'Motorista já possui indicação' });

    const referral = await prisma.referrals.create({
      data: { agent_id, driver_phone, driver_id, lead_id, reward_amount: reward_amount || 20.00 },
      include: { agent: { select: { name: true, phone: true } } },
    });
    return res.json({ success: true, data: referral });
  } catch (err) {
    console.error('[REFERRALS] create error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar indicação' });
  }
});

// PATCH /api/admin/referrals/:id — ações de status
router.patch('/referrals/:id', async (req: Request, res: Response) => {
  try {
    const { action, payment_ref, rejection_reason } = req.body;
    const admin = (req as any).admin;
    const referral = await prisma.referrals.findUnique({ where: { id: req.params.id }, include: { agent: true } });
    if (!referral) return res.status(404).json({ success: false, error: 'Indicação não encontrada' });

    const data: any = { updated_at: new Date() };

    switch (action) {
      case 'approve_payment':
        if (referral.status !== 'qualified') return res.status(400).json({ success: false, error: 'Indicação não está qualificada' });
        if (!referral.agent.pix_key) return res.status(400).json({ success: false, error: 'Indicador não possui chave PIX' });
        if (referral.payment_status !== 'pending_approval') return res.status(400).json({ success: false, error: `Status de pagamento inválido: ${referral.payment_status}` });
        data.payment_status = 'approved';
        data.payment_approved_at = new Date();
        data.payment_approved_by = admin.id;
        break;

      case 'mark_paid':
        if (referral.payment_status !== 'approved') return res.status(400).json({ success: false, error: 'Pagamento não está aprovado' });
        if (!payment_ref) return res.status(400).json({ success: false, error: 'Referência do pagamento obrigatória' });
        data.payment_status = 'paid';
        data.payment_paid_at = new Date();
        data.payment_paid_by = admin.id;
        data.payment_ref = payment_ref;
        break;

      case 'reject':
        if (referral.payment_status === 'paid') return res.status(400).json({ success: false, error: 'Pagamento já realizado' });
        data.status = 'rejected';
        data.rejected_at = new Date();
        data.rejection_reason = rejection_reason || 'Rejeitado pelo admin';
        data.payment_status = 'canceled';
        data.payment_canceled_at = new Date();
        data.payment_cancel_reason = rejection_reason || 'Indicação rejeitada';
        break;

      case 'cancel_payment':
        if (referral.payment_status === 'paid') return res.status(400).json({ success: false, error: 'Pagamento já realizado' });
        data.payment_status = 'canceled';
        data.payment_canceled_at = new Date();
        data.payment_cancel_reason = rejection_reason || 'Cancelado pelo admin';
        break;

      default:
        return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    const updated = await prisma.referrals.update({ where: { id: req.params.id }, data, include: { agent: true } });
    console.log(`[REFERRAL_ACTION] id=${referral.id} action=${action} by=${admin.id}`);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[REFERRALS] action error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao processar ação' });
  }
});

export default router;
