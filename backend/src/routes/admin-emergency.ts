import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN']));

// List emergency events
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status && typeof status === 'string') where.status = status;

    const events = await prisma.ride_emergency_events.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        _count: { select: { location_trail: true } },
      },
    });

    const admin = (req as any).admin;
    console.log(`[EMERGENCY_AUDIT] admin_id=${admin.id} action=list_events count=${events.length}`);

    res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('[ADMIN_EMERGENCY_LIST_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Get emergency event detail with trail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.ride_emergency_events.findUnique({
      where: { id: req.params.id },
      include: {
        location_trail: { orderBy: { captured_at: 'asc' } },
      },
    });

    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });

    const admin = (req as any).admin;
    console.log(`[EMERGENCY_AUDIT] admin_id=${admin.id} action=view_event event_id=${event.id}`);

    res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[ADMIN_EMERGENCY_DETAIL_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Resolve emergency event
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { status, resolution_notes } = req.body;
    if (!status || !['resolved', 'false_alarm'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use "resolved" ou "false_alarm"' });
    }
    if (!resolution_notes || typeof resolution_notes !== 'string' || resolution_notes.trim().length < 3) {
      return res.status(400).json({ error: 'Notas de resolução obrigatórias' });
    }

    const event = await prisma.ride_emergency_events.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Evento não encontrado' });
    if (event.status !== 'active') return res.status(400).json({ error: 'Evento já resolvido' });

    const admin = (req as any).admin;

    const updated = await prisma.ride_emergency_events.update({
      where: { id: req.params.id },
      data: {
        status,
        resolved_by: admin.id,
        resolved_at: new Date(),
        resolution_notes: resolution_notes.trim(),
      },
    });

    console.log(`[EMERGENCY_AUDIT] admin_id=${admin.id} action=resolve_event event_id=${event.id} status=${status}`);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[ADMIN_EMERGENCY_RESOLVE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create safety check (admin verification of active ride)
router.post('/safety-check', async (req: Request, res: Response) => {
  try {
    const { ride_id, status, notes } = req.body;
    if (!ride_id) return res.status(400).json({ error: 'ride_id obrigatório' });
    if (!notes || notes.trim().length < 2) return res.status(400).json({ error: 'Observação obrigatória' });

    const validStatuses = ['resolved', 'active'];
    const finalStatus = validStatuses.includes(status) ? status : 'resolved';
    const admin = (req as any).admin;

    const event = await prisma.ride_emergency_events.create({
      data: {
        ride_id,
        triggered_by_type: 'admin',
        triggered_by_id: admin.id,
        trigger_source: 'admin_safety_check',
        status: finalStatus,
        snapshot: { type: 'safety_check', notes: notes.trim(), checked_at: new Date().toISOString() },
        resolved_by: finalStatus === 'resolved' ? admin.id : null,
        resolved_at: finalStatus === 'resolved' ? new Date() : null,
        resolution_notes: notes.trim(),
      },
    });

    console.log(`[SAFETY_CHECK] admin_id=${admin.id} ride_id=${ride_id} status=${finalStatus}`);
    res.status(201).json({ success: true, data: event });
  } catch (error: any) {
    console.error('[SAFETY_CHECK_ERROR]', error);
    res.status(500).json({ error: 'Erro ao registrar verificação' });
  }
});

export default router;
