import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/modality-queue — list modalities pending review (scoped by territory)
router.get('/modality-queue', authenticateAdmin, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'PENDING_REVIEW';
    const modality = req.query.modality as string;

    const where: any = { status };
    if (modality) where.modality = modality;

    // Territory scope: filter drivers by neighborhood/territory
    const scope = (req as any).territoryScope;
    if (scope) {
      const driverFilter: any = {};
      if (scope.neighborhoodIds?.length > 0) {
        driverFilter.neighborhood_id = { in: scope.neighborhoodIds };
      } else if (scope.territoryIds?.length > 0) {
        driverFilter.neighborhoods = { territory_id: { in: scope.territoryIds } };
      } else {
        return res.json({ success: true, data: [] });
      }
      where.driver = driverFilter;
    }

    const modalities = await prisma.driver_modalities.findMany({
      where,
      include: {
        driver: {
          select: { id: true, name: true, phone: true, email: true, neighborhood_id: true, community_id: true, photo_url: true, document_cpf: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    res.json({ success: true, data: modalities });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao listar fila de modalidades' });
  }
});

// PATCH /api/admin/modalities/:id/approve
router.patch('/modalities/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const { review_notes } = req.body;

    const modality = await prisma.driver_modalities.findUnique({ where: { id: req.params.id } });
    if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

    const updated = await prisma.driver_modalities.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', reviewed_at: new Date(), reviewed_by: adminId, review_notes: review_notes || null, rejected_reason: null },
    });

    // If driver is still pending, approve them too
    const driver = await prisma.drivers.findUnique({ where: { id: modality.driver_id }, select: { status: true } });
    if (driver && (driver.status === 'pending' || driver.status === 'rejected')) {
      await prisma.drivers.update({ where: { id: modality.driver_id }, data: { status: 'approved', approved_at: new Date(), approved_by: adminId } });
    }

    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: 'Erro ao aprovar modalidade' }); }
});

// PATCH /api/admin/modalities/:id/reject
router.patch('/modalities/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const { rejected_reason, review_notes } = req.body;

    const modality = await prisma.driver_modalities.findUnique({ where: { id: req.params.id } });
    if (!modality) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

    const updated = await prisma.driver_modalities.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', reviewed_at: new Date(), reviewed_by: adminId, rejected_reason: rejected_reason || null, review_notes: review_notes || null },
    });

    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: 'Erro ao reprovar modalidade' }); }
});

// PATCH /api/admin/modalities/:id/suspend
router.patch('/modalities/:id/suspend', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const { review_notes } = req.body;

    const updated = await prisma.driver_modalities.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED', reviewed_at: new Date(), reviewed_by: adminId, review_notes: review_notes || null },
    });

    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: 'Erro ao suspender modalidade' }); }
});

export default router;
