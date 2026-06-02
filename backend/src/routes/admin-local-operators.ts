import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
const prisma = new PrismaClient();

const VALID_STATUSES = ['researching', 'contact_found', 'contacted', 'waiting_reply', 'meeting_scheduled', 'interested', 'in_conversation', 'pilot', 'active', 'paused', 'discarded', 'invalid_data'];

// List all local operators (with filters)
router.get('/', authenticateAdmin, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const { status, city } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (city) where.city = { contains: city as string, mode: 'insensitive' };

    // Filtro territorial: TERRITORIAL_OPERATOR vê apenas operadores da cidade do território
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    if (admin.role === 'TERRITORIAL_OPERATOR') {
      if (!scope || scope.territoryIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      const territories = await prisma.operational_territories.findMany({
        where: { id: { in: scope.territoryIds } },
        select: { city_name: true },
      });
      const cityNames = territories.map(t => t.city_name).filter(Boolean) as string[];
      if (cityNames.length > 0) {
        where.city = { in: cityNames, mode: 'insensitive' };
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const operators = await prisma.local_operators.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: operators });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar operadores' });
  }
});

// Get single operator
router.get('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const op = await prisma.local_operators.findUnique({ where: { id: req.params.id } });
    if (!op) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar operador' });
  }
});

// Create operator
router.post('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { organization_name, responsible_name, responsible_role, phone, email, address, website, community, neighborhood, city, source, status, verified, notes } = req.body;
    if (!organization_name || !responsible_name || !responsible_role) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: organization_name, responsible_name, responsible_role' });
    }
    const op = await prisma.local_operators.create({
      data: { organization_name, responsible_name, responsible_role, phone: phone || null, email, address, website, community, neighborhood, city, source: source || 'site', status: status && VALID_STATUSES.includes(status) ? status : 'researching', verified: verified ?? false, notes },
    });
    res.status(201).json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao criar operador' });
  }
});

// Update operator
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { organization_name, responsible_name, responsible_role, phone, email, address, website, community, neighborhood, city, source, status, verified, notes, next_followup_at, drivers_referred, drivers_approved } = req.body;
    const op = await prisma.local_operators.update({
      where: { id: req.params.id },
      data: {
        ...(organization_name !== undefined && { organization_name }),
        ...(responsible_name !== undefined && { responsible_name }),
        ...(responsible_role !== undefined && { responsible_role }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
        ...(community !== undefined && { community }),
        ...(neighborhood !== undefined && { neighborhood }),
        ...(city !== undefined && { city }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(verified !== undefined && { verified }),
        ...(notes !== undefined && { notes }),
        ...(next_followup_at !== undefined && { next_followup_at: next_followup_at ? new Date(next_followup_at) : null }),
        ...(drivers_referred !== undefined && { drivers_referred }),
        ...(drivers_approved !== undefined && { drivers_approved }),
      },
    });
    res.json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar operador' });
  }
});

// Quick status update
router.patch('/:id/status', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${VALID_STATUSES.join(', ')}` });
    }
    const op = await prisma.local_operators.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
  }
});

// Delete operator
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.local_operators.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao remover operador' });
  }
});

export default router;
