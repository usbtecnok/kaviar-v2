import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticateAdmin, requireSuperAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
const prisma = new PrismaClient();
const CRM_ROLES = requireRole(['SUPER_ADMIN', 'TERRITORIAL_MANAGER']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/admin/commerce/accounts
router.get('/accounts', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const where: any = { deleted_at: null };

    if (admin.role !== 'SUPER_ADMIN') {
      const tIds = (scope?.territoryIds || []).filter((id: string) => id && UUID_RE.test(id));
      if (tIds.length === 0) return res.json({ success: true, data: [] });
      where.territory_id = { in: tIds };
    }

    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { trade_name: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }

    const accounts = await prisma.commerce_accounts.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('[admin-commerce] list error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar comércios' });
  }
});

// GET /api/admin/commerce/accounts/:id
router.get('/accounts/:id', authenticateAdmin, CRM_ROLES, async (req: Request, res: Response) => {
  try {
    const account = await prisma.commerce_accounts.findFirst({
      where: { id: req.params.id, deleted_at: null },
      include: { products: { where: { deleted_at: null }, orderBy: { sort_order: 'asc' } }, users: { select: { id: true, name: true, email: true, role: true, is_active: true, must_change_password: true } } },
    });
    if (!account) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao carregar comércio' });
  }
});

// POST /api/admin/commerce/accounts — create (from CRM lead or manual)
router.post('/accounts', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { crm_lead_id, name, trade_name, category, document_cnpj, document_cpf, phone, email, address, neighborhood_id, territory_id, commission_percent, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nome é obrigatório' });

    // Check duplicate crm_lead_id
    if (crm_lead_id) {
      const existing = await prisma.commerce_accounts.findFirst({ where: { crm_lead_id, deleted_at: null } });
      if (existing) return res.status(409).json({ success: false, error: 'Este lead já possui conta de comércio vinculada.', commerce_id: existing.id });
    }

    const account = await prisma.commerce_accounts.create({
      data: {
        crm_lead_id: crm_lead_id || null,
        name, trade_name: trade_name || null,
        category: category || 'outro',
        document_cnpj: document_cnpj || null, document_cpf: document_cpf || null,
        phone: phone || null, email: email || null,
        address: address || null, neighborhood_id: neighborhood_id || null,
        territory_id: territory_id && UUID_RE.test(territory_id) ? territory_id : null,
        commission_percent: commission_percent ?? 10.00,
        notes: notes || null,
      },
    });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('[admin-commerce] create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar comércio' });
  }
});

// PATCH /api/admin/commerce/accounts/:id
router.patch('/accounts/:id', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, trade_name, category, document_cnpj, document_cpf, phone, email, address, neighborhood_id, territory_id, commission_percent, notes, status } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (trade_name !== undefined) data.trade_name = trade_name || null;
    if (category !== undefined) data.category = category;
    if (document_cnpj !== undefined) data.document_cnpj = document_cnpj || null;
    if (document_cpf !== undefined) data.document_cpf = document_cpf || null;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address || null;
    if (neighborhood_id !== undefined) data.neighborhood_id = neighborhood_id || null;
    if (territory_id !== undefined) data.territory_id = territory_id && UUID_RE.test(territory_id) ? territory_id : null;
    if (commission_percent !== undefined) data.commission_percent = commission_percent;
    if (notes !== undefined) data.notes = notes || null;
    if (status !== undefined && ['pending', 'approved', 'active', 'paused', 'blocked'].includes(status)) {
      data.status = status;
      if (status === 'active') { data.is_active = true; }
      if (status === 'paused' || status === 'blocked') { data.is_active = false; }
    }

    const account = await prisma.commerce_accounts.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar' });
  }
});

// POST /api/admin/commerce/accounts/:id/activate — activate + create user with temp password
router.post('/accounts/:id/activate', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const account = await prisma.commerce_accounts.findFirst({ where: { id: req.params.id, deleted_at: null } });
    if (!account) return res.status(404).json({ success: false, error: 'Não encontrado' });
    if (!account.email) return res.status(400).json({ success: false, error: 'Comércio precisa ter email para ativar' });

    // Check if user already exists
    const existing = await prisma.commerce_users.findFirst({ where: { commerce_account_id: account.id } });
    if (existing) return res.status(400).json({ success: false, error: 'Comércio já possui usuário. Use reset de senha.' });

    // Generate temp password
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars hex
    const password_hash = await bcrypt.hash(tempPassword, 10);

    // Generate slug if not set
    let slug = account.slug;
    if (!slug) {
      slug = account.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = await prisma.commerce_accounts.findFirst({ where: { slug } });
      if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const [updatedAccount, user] = await prisma.$transaction([
      prisma.commerce_accounts.update({
        where: { id: account.id },
        data: { status: 'active', is_active: true, slug, approved_by: admin.id, approved_at: new Date() },
      }),
      prisma.commerce_users.create({
        data: { commerce_account_id: account.id, name: account.name, email: account.email, password_hash, role: 'owner', must_change_password: true },
      }),
    ]);

    // Return temp password ONLY here, ONCE
    res.json({ success: true, data: { account: updatedAccount, user: { id: user.id, email: user.email }, temp_password: tempPassword } });
  } catch (error) {
    console.error('[admin-commerce] activate error:', error);
    res.status(500).json({ success: false, error: 'Erro ao ativar' });
  }
});

// POST /api/admin/commerce/accounts/:id/reset-password — SUPER_ADMIN reset
router.post('/accounts/:id/reset-password', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const user = await prisma.commerce_users.findFirst({ where: { commerce_account_id: req.params.id, role: 'owner' } });
    if (!user) return res.status(404).json({ success: false, error: 'Usuário do comércio não encontrado' });

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await prisma.commerce_users.update({ where: { id: user.id }, data: { password_hash, must_change_password: true } });

    res.json({ success: true, data: { email: user.email, temp_password: tempPassword } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao resetar senha' });
  }
});

// GET /api/admin/commerce/orders — list all orders
router.get('/orders', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const where: any = {};

    if (admin.role !== 'SUPER_ADMIN') {
      const tIds = (scope?.territoryIds || []).filter((id: string) => id && UUID_RE.test(id));
      if (tIds.length === 0) return res.json({ success: true, data: [] });
      where.account = { territory_id: { in: tIds } };
    }

    if (req.query.status) where.status = req.query.status;
    if (req.query.commerce_id) where.commerce_account_id = req.query.commerce_id;

    const orders = await prisma.commerce_orders.findMany({
      where,
      include: { items: true, account: { select: { name: true, slug: true } } },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('[admin-commerce] orders error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar pedidos' });
  }
});

// PATCH /api/admin/commerce/orders/:id/confirm-payment — manual payment confirmation
router.patch('/orders/:id/confirm-payment', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const order = await prisma.commerce_orders.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (order.payment_status === 'paid') return res.json({ success: true, data: { already_paid: true } });

    // Transaction: mark paid + credit wallet
    await prisma.$transaction(async (tx) => {
      await tx.commerce_orders.update({ where: { id: order.id }, data: { payment_status: 'paid', paid_at: new Date() } });
      await tx.$executeRawUnsafe(`INSERT INTO commerce_wallets (commerce_account_id) VALUES ($1) ON CONFLICT (commerce_account_id) DO NOTHING`, order.commerce_account_id);
      await tx.$executeRawUnsafe(`UPDATE commerce_wallets SET pending_balance_cents = pending_balance_cents + $1, total_received_cents = total_received_cents + $1, updated_at = NOW() WHERE commerce_account_id = $2`, order.commerce_net_cents, order.commerce_account_id);
      const bal: any = await tx.$queryRawUnsafe(`SELECT pending_balance_cents + available_balance_cents as total FROM commerce_wallets WHERE commerce_account_id = $1`, order.commerce_account_id);
      await tx.commerce_wallet_transactions.create({ data: { commerce_account_id: order.commerce_account_id, order_id: order.id, type: 'ORDER_CREDIT', amount_cents: order.commerce_net_cents, balance_after_cents: bal[0]?.total || 0, description: 'Pagamento confirmado manualmente', created_by_admin_id: admin.id } });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[admin-commerce] confirm-payment error:', error);
    res.status(500).json({ success: false, error: 'Erro ao confirmar pagamento' });
  }
});

// GET /api/admin/commerce/withdrawals
router.get('/withdrawals', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.status) where.status = req.query.status;
    const withdrawals = await prisma.commerce_withdrawal_requests.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    res.json({ success: true, data: withdrawals });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
});

// PATCH /api/admin/commerce/withdrawals/:id — approve/reject/pay
router.patch('/withdrawals/:id', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { action, rejection_reason } = req.body; // action: approve | reject | pay
    const wd = await prisma.commerce_withdrawal_requests.findUnique({ where: { id: req.params.id } });
    if (!wd) return res.status(404).json({ success: false, error: 'Não encontrado' });

    if (action === 'approve' && wd.status === 'REQUESTED') {
      await prisma.commerce_withdrawal_requests.update({ where: { id: wd.id }, data: { status: 'APPROVED', approved_by_admin_id: admin.id, approved_at: new Date() } });
    } else if (action === 'reject' && ['REQUESTED', 'APPROVED'].includes(wd.status)) {
      await prisma.commerce_withdrawal_requests.update({ where: { id: wd.id }, data: { status: 'REJECTED', rejection_reason: rejection_reason || null, approved_by_admin_id: admin.id, approved_at: new Date() } });
    } else if (action === 'pay' && wd.status === 'APPROVED') {
      // Debit wallet in transaction
      await prisma.$transaction(async (tx) => {
        const wallet: any = await tx.$queryRawUnsafe(`SELECT available_balance_cents FROM commerce_wallets WHERE commerce_account_id = $1 FOR UPDATE`, wd.commerce_account_id);
        if (!wallet[0] || wallet[0].available_balance_cents < wd.amount_cents) throw new Error('Saldo insuficiente');
        await tx.$executeRawUnsafe(`UPDATE commerce_wallets SET available_balance_cents = available_balance_cents - $1, total_withdrawn_cents = total_withdrawn_cents + $1, updated_at = NOW() WHERE commerce_account_id = $2`, wd.amount_cents, wd.commerce_account_id);
        await tx.commerce_withdrawal_requests.update({ where: { id: wd.id }, data: { status: 'PAID', paid_by_admin_id: admin.id, paid_at: new Date() } });
        const bal: any = await tx.$queryRawUnsafe(`SELECT available_balance_cents + pending_balance_cents as total FROM commerce_wallets WHERE commerce_account_id = $1`, wd.commerce_account_id);
        await tx.commerce_wallet_transactions.create({ data: { commerce_account_id: wd.commerce_account_id, withdrawal_id: wd.id, type: 'WITHDRAWAL_PAID', amount_cents: -wd.amount_cents, balance_after_cents: bal[0]?.total || 0, description: `Saque pago`, created_by_admin_id: admin.id } });
      });
    } else {
      return res.status(400).json({ success: false, error: 'Ação inválida para o status atual' });
    }

    const updated = await prisma.commerce_withdrawal_requests.findUnique({ where: { id: wd.id } });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[admin-commerce] withdrawal error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Erro' });
  }
});

export default router;
