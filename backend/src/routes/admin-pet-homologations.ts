import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();
const PET_ROLES = ['SUPER_ADMIN', 'PET_OPERATOR', 'PET_SUPERVISOR', 'PET_ADMIN'];

router.use(authenticateAdmin);
router.use(requireRole(PET_ROLES));

async function addLog(homologation_id: string, action: string, admin: any, extra: any = {}) {
  await prisma.pet_homologation_logs.create({
    data: { homologation_id, action, admin_id: admin.id, admin_name: admin.name, ...extra },
  });
}

// GET /api/admin/pet/homologations
router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { status, operator_id } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (operator_id) where.operator_id = operator_id;

    // PET_OPERATOR vê apenas os seus
    if (admin.role === 'PET_OPERATOR') {
      where.operator_id = admin.id;
    }

    const homologations = await prisma.pet_homologations.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: homologations });
  } catch (err) {
    console.error('[PET_HOMOLOGATIONS] list error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar homologações' });
  }
});

// POST /api/admin/pet/homologations
router.post('/', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { name, phone, email, region, vehicle_model, vehicle_year, four_doors, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios' });
    }

    const homologation = await prisma.pet_homologations.create({
      data: { name, phone, email, region, vehicle_model, vehicle_year, four_doors: four_doors !== false, notes, operator_id: admin.role === 'PET_OPERATOR' ? admin.id : null },
    });

    await addLog(homologation.id, 'created', admin);
    return res.json({ success: true, data: homologation });
  } catch (err) {
    console.error('[PET_HOMOLOGATIONS] create error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar homologação' });
  }
});

// PATCH /api/admin/pet/homologations/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { status, notes } = req.body;

    const existing = await prisma.pet_homologations.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Homologação não encontrada' });

    // PET_OPERATOR só altera os seus
    if (admin.role === 'PET_OPERATOR' && existing.operator_id !== admin.id) {
      return res.status(403).json({ success: false, error: 'Sem permissão' });
    }

    const data: any = { updated_at: new Date() };
    if (status && status !== existing.status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.pet_homologations.update({ where: { id: req.params.id }, data });

    if (status && status !== existing.status) {
      await addLog(updated.id, 'status_changed', admin, { old_status: existing.status, new_status: status });
    }
    if (notes !== undefined && notes !== existing.notes) {
      await addLog(updated.id, 'note_added', admin, { note: notes });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PET_HOMOLOGATIONS] update error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar homologação' });
  }
});

// PATCH /api/admin/pet/homologations/:id/assign
router.patch('/:id/assign', requireRole(['SUPER_ADMIN', 'PET_SUPERVISOR', 'PET_ADMIN']), async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const { operator_id } = req.body;

    const existing = await prisma.pet_homologations.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Homologação não encontrada' });

    const updated = await prisma.pet_homologations.update({
      where: { id: req.params.id },
      data: { operator_id: operator_id || null, assigned_at: operator_id ? new Date() : null, assigned_by: operator_id ? admin.id : null, updated_at: new Date() },
    });

    await addLog(updated.id, 'assigned', admin, { old_operator_id: existing.operator_id, new_operator_id: operator_id || null });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PET_HOMOLOGATIONS] assign error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atribuir operador' });
  }
});

// GET /api/admin/pet/homologations/:id/logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const logs = await prisma.pet_homologation_logs.findMany({
      where: { homologation_id: req.params.id },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[PET_HOMOLOGATIONS] logs error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao buscar logs' });
  }
});

export default router;
