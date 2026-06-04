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

    const [updatedAccount, user] = await prisma.$transaction([
      prisma.commerce_accounts.update({
        where: { id: account.id },
        data: { status: 'active', is_active: true, approved_by: admin.id, approved_at: new Date() },
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

export default router;
