import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticateAdmin, requireSuperAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { audit, auditCtx } from '../utils/audit';

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

    // Sanitize for non-SUPER_ADMIN: remove financial/sensitive fields
    const data = admin.role === 'SUPER_ADMIN' ? accounts : accounts.map((a: any) => {
      const { commission_percent, document_cnpj, document_cpf, payout_pix_key, payout_pix_key_type, payout_receiver_name, notes, approved_by, ...safe } = a;
      return safe;
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('[admin-commerce] list error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar comércios' });
  }
});

// GET /api/admin/commerce/accounts/:id
router.get('/accounts/:id', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    const isSuperAdmin = admin.role === 'SUPER_ADMIN';

    const account = await prisma.commerce_accounts.findFirst({
      where: { id: req.params.id, deleted_at: null },
      include: {
        products: { where: { deleted_at: null }, orderBy: { sort_order: 'asc' }, ...(!isSuperAdmin && { select: { id: true, name: true, is_available: true, is_restricted: true } }) },
        ...(isSuperAdmin && { users: { select: { id: true, name: true, email: true, role: true, is_active: true, must_change_password: true } }, wallet: true }),
      },
    });
    if (!account) return res.status(404).json({ success: false, error: 'Não encontrado' });

    // Territory scope check: non-SUPER_ADMIN must have account in their territory
    if (!isSuperAdmin) {
      const tIds = scope?.territoryIds || [];
      const nIds = scope?.neighborhoodIds || [];
      if (tIds.length === 0 && nIds.length === 0) {
        return res.status(404).json({ success: false, error: 'Não encontrado' });
      }
      let inScope = account.territory_id && tIds.includes(account.territory_id);
      if (!inScope && !account.territory_id && account.neighborhood_id && nIds.includes(account.neighborhood_id)) {
        inScope = true;
      }
      if (!inScope) {
        return res.status(404).json({ success: false, error: 'Não encontrado' });
      }

      // Sanitize response for territorial roles
      const { commission_percent, document_cnpj, document_cpf, payout_pix_key, payout_pix_key_type, payout_receiver_name, notes, approved_by, crm_lead_id, wallet, users, ...safe } = account as any;
      return res.json({ success: true, data: safe });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao carregar comércio' });
  }
});

// POST /api/admin/commerce/accounts — create (from CRM lead or manual)
router.post('/accounts', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const isSuperAdmin = admin.role === 'SUPER_ADMIN';

    // TERRITORIAL_MANAGER: allowlist + scope enforcement
    const BLOCKED_FIELDS = ['commission_percent', 'document_cnpj', 'document_cpf', 'payout_pix_key', 'payout_pix_key_type', 'payout_receiver_name', 'notes', 'approved_by', 'approved_at', 'status', 'is_active', 'crm_lead_id'];
    if (!isSuperAdmin) {
      const sent = Object.keys(req.body);
      const forbidden = sent.filter(k => BLOCKED_FIELDS.includes(k));
      if (forbidden.length > 0) return res.status(400).json({ success: false, error: `Campos não permitidos: ${forbidden.join(', ')}` });
    }

    const { crm_lead_id, name, trade_name, category, document_cnpj, document_cpf, phone, email, address, neighborhood_id, territory_id, commission_percent, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nome é obrigatório' });

    // Territory validation
    const finalTerritoryId = territory_id && UUID_RE.test(territory_id) ? territory_id : null;
    const finalNeighborhoodId = neighborhood_id || null;

    if (!isSuperAdmin) {
      // TERRITORIAL_MANAGER: territory_id obrigatório e deve estar no scope
      if (!finalTerritoryId) return res.status(400).json({ success: false, error: 'Território é obrigatório.' });
      const tIds = scope?.territoryIds || [];
      if (!tIds.includes(finalTerritoryId)) return res.status(403).json({ success: false, error: 'Território fora do seu escopo.' });
    }

    // Validar coerência território/bairro
    if (!finalTerritoryId && finalNeighborhoodId) {
      return res.status(400).json({ success: false, error: 'Não é possível definir bairro sem território.' });
    }
    if (finalTerritoryId && finalNeighborhoodId) {
      const nbh = await prisma.neighborhoods.findUnique({ where: { id: finalNeighborhoodId }, select: { territory_id: true } });
      if (!nbh) return res.status(400).json({ success: false, error: 'Bairro não encontrado.' });
      if (nbh.territory_id !== finalTerritoryId) return res.status(400).json({ success: false, error: 'O bairro selecionado não pertence ao território informado.' });
    }

    // Check duplicate crm_lead_id (SUPER_ADMIN only)
    if (isSuperAdmin && crm_lead_id) {
      const existing = await prisma.commerce_accounts.findFirst({ where: { crm_lead_id, deleted_at: null } });
      if (existing) return res.status(409).json({ success: false, error: 'Este lead já possui conta de comércio vinculada.', commerce_id: existing.id });
    }

    const account = await prisma.commerce_accounts.create({
      data: {
        crm_lead_id: isSuperAdmin ? (crm_lead_id || null) : null,
        name, trade_name: trade_name || null,
        category: category || 'outro',
        document_cnpj: isSuperAdmin ? (document_cnpj || null) : null,
        document_cpf: isSuperAdmin ? (document_cpf || null) : null,
        phone: phone || null, email: email || null,
        address: address || null, neighborhood_id: finalNeighborhoodId,
        territory_id: finalTerritoryId,
        commission_percent: isSuperAdmin ? (commission_percent ?? 10.00) : 10.00,
        notes: isSuperAdmin ? (notes || null) : null,
      },
    });

    // Audit
    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'commerce_account_created', entityType: 'commerce_account', entityId: account.id, newValue: { name, territory_id: finalTerritoryId, neighborhood_id: finalNeighborhoodId, category, created_by_role: admin.role }, ipAddress: ctx.ip, userAgent: ctx.ua });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error('[admin-commerce] create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar comércio' });
  }
});

// PATCH /api/admin/commerce/accounts/:id
router.patch('/accounts/:id', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const isSuperAdmin = admin.role === 'SUPER_ADMIN';

    // Scope check: verify account is in admin's territory
    const existing = await prisma.commerce_accounts.findFirst({ where: { id: req.params.id, deleted_at: null } });
    if (!existing) return res.status(404).json({ success: false, error: 'Não encontrado' });

    if (!isSuperAdmin) {
      const tIds = scope?.territoryIds || [];
      const nIds = scope?.neighborhoodIds || [];
      let inScope = existing.territory_id && tIds.includes(existing.territory_id);
      if (!inScope && !existing.territory_id && existing.neighborhood_id && nIds.includes(existing.neighborhood_id)) inScope = true;
      if (!inScope) return res.status(404).json({ success: false, error: 'Não encontrado' });

      // Blocklist enforcement
      const BLOCKED_FIELDS = ['commission_percent', 'document_cnpj', 'document_cpf', 'payout_pix_key', 'payout_pix_key_type', 'payout_receiver_name', 'notes', 'approved_by', 'approved_at', 'status', 'is_active', 'crm_lead_id', 'territory_id', 'neighborhood_id'];
      const sent = Object.keys(req.body);
      const forbidden = sent.filter(k => BLOCKED_FIELDS.includes(k));
      if (forbidden.length > 0) return res.status(400).json({ success: false, error: `Campos não permitidos: ${forbidden.join(', ')}` });
    }

    // Build update data
    const { name, trade_name, category, document_cnpj, document_cpf, phone, email, address, neighborhood_id, territory_id, commission_percent, notes, status } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (trade_name !== undefined) data.trade_name = trade_name || null;
    if (category !== undefined) data.category = category;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address || null;

    // SUPER_ADMIN only fields
    if (isSuperAdmin) {
      if (document_cnpj !== undefined) data.document_cnpj = document_cnpj || null;
      if (document_cpf !== undefined) data.document_cpf = document_cpf || null;
      if (neighborhood_id !== undefined) data.neighborhood_id = neighborhood_id || null;
      if (territory_id !== undefined) data.territory_id = territory_id && UUID_RE.test(territory_id) ? territory_id : null;

      // Validar coerência território/bairro
      if (territory_id !== undefined || neighborhood_id !== undefined) {
        const finalT = territory_id !== undefined ? (data.territory_id) : existing.territory_id;
        if (territory_id !== undefined && neighborhood_id === undefined && existing.neighborhood_id) {
          data.neighborhood_id = null;
        }
        const finalN = neighborhood_id !== undefined ? (data.neighborhood_id) : (data.neighborhood_id !== undefined ? data.neighborhood_id : existing.neighborhood_id);
        if (!finalT && finalN) return res.status(400).json({ success: false, error: 'Não é possível definir bairro sem território.' });
        if (finalT && finalN) {
          const nbh = await prisma.neighborhoods.findUnique({ where: { id: finalN }, select: { territory_id: true } });
          if (!nbh) return res.status(400).json({ success: false, error: 'Bairro não encontrado.' });
          if (nbh.territory_id !== finalT) return res.status(400).json({ success: false, error: 'O bairro selecionado não pertence ao território informado.' });
        }
      }
      if (commission_percent !== undefined) data.commission_percent = commission_percent;
      if (notes !== undefined) data.notes = notes || null;
      if (status !== undefined && ['pending', 'approved', 'active', 'paused', 'blocked'].includes(status)) {
        data.status = status;
        if (status === 'active') { data.is_active = true; }
        if (status === 'paused' || status === 'blocked') { data.is_active = false; }
      }
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ success: false, error: 'Nenhum campo para atualizar.' });

    const account = await prisma.commerce_accounts.update({ where: { id: req.params.id }, data });

    // Audit
    const ctx = auditCtx(req);
    audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'commerce_account_updated', entityType: 'commerce_account', entityId: account.id, oldValue: { name: existing.name, category: existing.category, territory_id: existing.territory_id }, newValue: data, ipAddress: ctx.ip, userAgent: ctx.ua });

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

    // Mark paid
    await prisma.commerce_orders.update({ where: { id: order.id }, data: { payment_status: 'paid', paid_at: new Date() } });

    // Ensure wallet exists
    await prisma.commerce_wallets.upsert({
      where: { commerce_account_id: order.commerce_account_id },
      create: { commerce_account_id: order.commerce_account_id },
      update: {},
    });

    // Credit pending balance
    const wallet = await prisma.commerce_wallets.update({
      where: { commerce_account_id: order.commerce_account_id },
      data: { pending_balance_cents: { increment: order.commerce_net_cents }, total_received_cents: { increment: order.commerce_net_cents } },
    });

    // Transaction log
    await prisma.commerce_wallet_transactions.create({ data: { commerce_account_id: order.commerce_account_id, order_id: order.id, type: 'ORDER_CREDIT', amount_cents: order.commerce_net_cents, balance_after_cents: wallet.pending_balance_cents + wallet.available_balance_cents, description: 'Pagamento confirmado manualmente', created_by_admin_id: admin.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[admin-commerce] confirm-payment error:', error);
    res.status(500).json({ success: false, error: 'Erro ao confirmar pagamento' });
  }
});

// ─── Finance ────────────────────────────────────────────────────────────────

// GET /api/admin/commerce/finance/summary
router.get('/finance/summary', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    // Territory filter for TERRITORIAL_MANAGER
    let accountFilter: any = { deleted_at: null, is_active: true };
    if (admin.role !== 'SUPER_ADMIN') {
      const tIds = (scope?.territoryIds || []).filter((id: string) => id && UUID_RE.test(id));
      if (tIds.length === 0) return res.json({ success: true, data: { total_sold: 0, kaviar_commission: 0, pending_balance: 0, available_balance: 0, total_withdrawn: 0, withdrawals_requested: 0, withdrawals_approved: 0, withdrawals_paid: 0 } });
      accountFilter.territory_id = { in: tIds };
    }

    const accountIds = (await prisma.commerce_accounts.findMany({ where: accountFilter, select: { id: true } })).map(a => a.id);
    if (accountIds.length === 0) return res.json({ success: true, data: { total_sold: 0, kaviar_commission: 0, pending_balance: 0, available_balance: 0, total_withdrawn: 0, withdrawals_requested: 0, withdrawals_approved: 0, withdrawals_paid: 0 } });

    const [orders, wallets, wdCounts] = await Promise.all([
      prisma.commerce_orders.aggregate({ where: { payment_status: 'paid', commerce_account_id: { in: accountIds } }, _sum: { total_cents: true, kaviar_commission_cents: true } }),
      prisma.commerce_wallets.aggregate({ where: { commerce_account_id: { in: accountIds } }, _sum: { pending_balance_cents: true, available_balance_cents: true, total_withdrawn_cents: true } }),
      prisma.commerce_withdrawal_requests.groupBy({ by: ['status'], where: { commerce_account_id: { in: accountIds } }, _count: true }),
    ]);
    const wdMap: Record<string, number> = {};
    for (const w of wdCounts) wdMap[w.status] = w._count;
    res.json({ success: true, data: {
      total_sold: orders._sum.total_cents || 0,
      kaviar_commission: orders._sum.kaviar_commission_cents || 0,
      pending_balance: wallets._sum.pending_balance_cents || 0,
      available_balance: wallets._sum.available_balance_cents || 0,
      total_withdrawn: wallets._sum.total_withdrawn_cents || 0,
      withdrawals_requested: wdMap.REQUESTED || 0,
      withdrawals_approved: wdMap.APPROVED || 0,
      withdrawals_paid: wdMap.PAID || 0,
    } });
  } catch (error) { res.status(500).json({ success: false, error: 'Erro' }); }
});

// GET /api/admin/commerce/finance/by-account
router.get('/finance/by-account', authenticateAdmin, CRM_ROLES, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    let accountFilter: any = { deleted_at: null, is_active: true };
    if (admin.role !== 'SUPER_ADMIN') {
      const tIds = (scope?.territoryIds || []).filter((id: string) => id && UUID_RE.test(id));
      if (tIds.length === 0) return res.json({ success: true, data: [] });
      accountFilter.territory_id = { in: tIds };
    }

    const accounts = await prisma.commerce_accounts.findMany({ where: accountFilter, select: { id: true, name: true, category: true, status: true }, orderBy: { name: 'asc' } });
    const result = await Promise.all(accounts.map(async (a) => {
      const [orders, wallet, wdOpen, lastOrder, lastWd] = await Promise.all([
        prisma.commerce_orders.aggregate({ where: { commerce_account_id: a.id, payment_status: 'paid' }, _sum: { total_cents: true, kaviar_commission_cents: true } }),
        prisma.commerce_wallets.findUnique({ where: { commerce_account_id: a.id } }),
        prisma.commerce_withdrawal_requests.count({ where: { commerce_account_id: a.id, status: { in: ['REQUESTED', 'APPROVED'] } } }),
        prisma.commerce_orders.findFirst({ where: { commerce_account_id: a.id, payment_status: 'paid' }, orderBy: { created_at: 'desc' }, select: { created_at: true } }),
        prisma.commerce_withdrawal_requests.findFirst({ where: { commerce_account_id: a.id }, orderBy: { created_at: 'desc' }, select: { created_at: true } }),
      ]);
      return { ...a, total_sold: orders._sum.total_cents || 0, kaviar_commission: orders._sum.kaviar_commission_cents || 0, pending_balance: wallet?.pending_balance_cents || 0, available_balance: wallet?.available_balance_cents || 0, total_withdrawn: wallet?.total_withdrawn_cents || 0, withdrawals_open: wdOpen, last_order_at: lastOrder?.created_at || null, last_withdrawal_at: lastWd?.created_at || null };
    }));
    res.json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, error: 'Erro' }); }
});

// GET /api/admin/commerce/finance/export
router.get('/finance/export', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.commerce_accounts.findMany({ where: { deleted_at: null, is_active: true }, select: { id: true, name: true, category: true } });
    const rows = await Promise.all(accounts.map(async (a) => {
      const orders = await prisma.commerce_orders.aggregate({ where: { commerce_account_id: a.id, payment_status: 'paid' }, _sum: { total_cents: true, kaviar_commission_cents: true } });
      const wallet = await prisma.commerce_wallets.findUnique({ where: { commerce_account_id: a.id } });
      const wdOpen = await prisma.commerce_withdrawal_requests.count({ where: { commerce_account_id: a.id, status: { in: ['REQUESTED', 'APPROVED'] } } });
      return `"${a.name}","${a.category}",${orders._sum.total_cents || 0},${orders._sum.kaviar_commission_cents || 0},${wallet?.pending_balance_cents || 0},${wallet?.available_balance_cents || 0},${wallet?.total_withdrawn_cents || 0},${wdOpen}`;
    }));
    const csv = 'comercio,categoria,total_vendido_cents,comissao_kaviar_cents,saldo_pendente_cents,saldo_disponivel_cents,total_sacado_cents,saques_abertos\n' + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financeiro_comercios_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (error) { res.status(500).json({ success: false, error: 'Erro' }); }
});

// POST /api/admin/commerce/orders/:id/assign-driver
router.post('/orders/:id/assign-driver', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { driver_id, driver_name } = req.body;
    if (!driver_name) return res.status(400).json({ success: false, error: 'Nome do motorista obrigatório' });
    const order = await prisma.commerce_orders.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (order.delivery_status !== 'requested') return res.status(400).json({ success: false, error: 'Entrega não solicitada' });

    await prisma.commerce_orders.update({ where: { id: order.id }, data: { driver_id: driver_id || null, driver_name, delivery_status: 'assigned', status: 'DISPATCHED', dispatched_at: new Date() } });
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
});

// POST /api/admin/commerce/orders/:id/confirm-delivery
router.post('/orders/:id/confirm-delivery', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { delivery_code } = req.body;
    const order = await prisma.commerce_orders.findFirst({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (order.delivery_status !== 'assigned') return res.status(400).json({ success: false, error: 'Entrega não atribuída' });
    if (!delivery_code || delivery_code !== order.delivery_code) return res.status(400).json({ success: false, error: 'Código de entrega incorreto' });

    await prisma.commerce_orders.update({ where: { id: order.id }, data: { delivery_status: 'delivered', delivered_at: new Date(), status: 'COMPLETED', completed_at: new Date() } });

    // Move pending → available if paid
    if (order.payment_status === 'paid') {
      const wallet = await prisma.commerce_wallets.findUnique({ where: { commerce_account_id: order.commerce_account_id } });
      if (wallet && wallet.pending_balance_cents >= order.commerce_net_cents) {
        await prisma.commerce_wallets.update({ where: { commerce_account_id: order.commerce_account_id }, data: { pending_balance_cents: { decrement: order.commerce_net_cents }, available_balance_cents: { increment: order.commerce_net_cents } } });
      }
    }
    res.json({ success: true });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
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
      // Verify balance
      const wallet = await prisma.commerce_wallets.findUnique({ where: { commerce_account_id: wd.commerce_account_id } });
      if (!wallet || wallet.available_balance_cents < wd.amount_cents) return res.status(400).json({ success: false, error: 'Saldo insuficiente' });

      // Debit wallet
      const updated_wallet = await prisma.commerce_wallets.update({
        where: { commerce_account_id: wd.commerce_account_id },
        data: { available_balance_cents: { decrement: wd.amount_cents }, total_withdrawn_cents: { increment: wd.amount_cents } },
      });
      await prisma.commerce_withdrawal_requests.update({ where: { id: wd.id }, data: { status: 'PAID', paid_by_admin_id: admin.id, paid_at: new Date() } });
      await prisma.commerce_wallet_transactions.create({ data: { commerce_account_id: wd.commerce_account_id, withdrawal_id: wd.id, type: 'WITHDRAWAL_PAID', amount_cents: -wd.amount_cents, balance_after_cents: updated_wallet.available_balance_cents + updated_wallet.pending_balance_cents, description: 'Saque pago', created_by_admin_id: admin.id } });
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
