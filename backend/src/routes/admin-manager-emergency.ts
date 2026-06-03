import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
router.use(authenticateAdmin);
router.use(requireRole(['TERRITORIAL_MANAGER', 'SUPER_ADMIN']));
router.use(applyTerritoryScope);

// List emergency events filtered by territory scope
router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    const { status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') where.status = status;

    // TERRITORIAL_MANAGER: filter by territory neighborhoods
    if (scope && scope.neighborhoodIds?.length > 0) {
      where.ride = { origin_neighborhood_id: { in: scope.neighborhoodIds } };
    } else if (admin.role === 'TERRITORIAL_MANAGER') {
      // No territory assigned — return empty
      return res.json({ success: true, data: [] });
    }

    const events = await prisma.ride_emergency_events.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        ride: { select: { origin_neighborhood_id: true, origin_text: true, destination_text: true, status: true } },
      },
    });

    // Sanitize for TERRITORIAL_MANAGER: remove sensitive fields from snapshot
    const sanitized = events.map(ev => {
      const snap = ev.snapshot as any || {};
      const safe: any = {
        id: ev.id,
        ride_id: ev.ride_id,
        triggered_by_type: ev.triggered_by_type,
        trigger_source: ev.trigger_source,
        status: ev.status,
        created_at: ev.created_at,
        resolved_at: ev.resolved_at,
        resolution_notes: ev.resolution_notes,
        ride_status: ev.ride?.status,
        origin_text: ev.ride?.origin_text || snap.origin_text,
        destination_text: ev.ride?.destination_text || snap.dest_text,
        passenger_name: snap.passenger?.name,
        driver_name: snap.driver?.name,
        driver_plate: snap.driver?.vehicle_plate,
      };
      // SUPER_ADMIN gets full snapshot
      if (admin.role === 'SUPER_ADMIN') {
        safe.snapshot = snap;
      }
      return safe;
    });

    console.log(`[EMERGENCY_AUDIT] admin_id=${admin.id} role=${admin.role} action=manager_list_events count=${sanitized.length}`);
    res.json({ success: true, data: sanitized });
  } catch (error: any) {
    console.error('[MANAGER_EMERGENCY_LIST_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
