import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

const AMOUNT_CENTS = parseInt(process.env.COMPENSATION_AMOUNT_CENTS || '500', 10);
const CREDITS = parseInt(process.env.COMPENSATION_CREDITS || '1', 10);

// GET /api/admin/compensations — listar
router.get('/', requireRole(['SUPER_ADMIN', 'FINANCE']), async (_req: Request, res: Response) => {
  try {
    const items = await prisma.ride_compensations.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/compensations — gerar compensação Pix
router.post('/', requireRole(['SUPER_ADMIN', 'FINANCE']), async (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'COMPENSATION_PAYMENT_FLOW_NOT_AVAILABLE',
    message: 'Fluxo financeiro de compensação temporariamente indisponível.',
  });
});

// PATCH /api/admin/compensations/:id/waive — dispensar cobrança
router.patch('/:id/waive', requireRole(['SUPER_ADMIN', 'FINANCE']), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const comp = await prisma.ride_compensations.findUnique({ where: { id: req.params.id } });
    if (!comp) return res.status(404).json({ success: false, error: 'Compensação não encontrada' });
    if (comp.status !== 'pending') return res.status(400).json({ success: false, error: `Não é possível dispensar: status=${comp.status}` });

    const updated = await prisma.ride_compensations.update({
      where: { id: req.params.id },
      data: { status: 'waived', waived_at: new Date(), waived_by: (req as any).adminId, waived_reason: reason || null },
    });

    console.log(`[COMPENSATION] waived id=${comp.id} by=${(req as any).adminId}`);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
