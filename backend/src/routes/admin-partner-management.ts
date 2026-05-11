import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// --- Members CRUD ---

router.get('/:id/members', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const members = await prisma.partner_members.findMany({
      where: { partner_id: req.params.id },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar associados' });
  }
});

router.post('/:id/members', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, unit } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nome obrigatório' });
    const member = await prisma.partner_members.create({
      data: { partner_id: req.params.id, name, unit: unit || null },
    });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao criar associado' });
  }
});

router.patch('/:id/members/:memberId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, unit, status } = req.body;
    const member = await prisma.partner_members.update({
      where: { id: req.params.memberId },
      data: { ...(name && { name }), ...(unit !== undefined && { unit }), ...(status && { status }) },
    });
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar associado' });
  }
});

// --- Transactions CRUD ---

router.get('/:id/transactions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { reference_month } = req.query;
    const where: any = { partner_id: req.params.id };
    if (reference_month) where.reference_month = reference_month;
    const transactions = await prisma.partner_transactions.findMany({ where, orderBy: { created_at: 'desc' }, take: 200 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar transações' });
  }
});

router.post('/:id/transactions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { type, amount_cents, description, category, reference_month, member_id } = req.body;
    if (!type || !amount_cents || !description) {
      return res.status(400).json({ success: false, error: 'type, amount_cents e description obrigatórios' });
    }
    const tx = await prisma.partner_transactions.create({
      data: { partner_id: req.params.id, type, amount_cents: Number(amount_cents), description, category: category || 'outro', reference_month: reference_month || null, member_id: member_id || null },
    });
    res.status(201).json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao registrar transação' });
  }
});

router.delete('/:id/transactions/:txId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.partner_transactions.delete({ where: { id: req.params.txId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao remover transação' });
  }
});

export default router;
