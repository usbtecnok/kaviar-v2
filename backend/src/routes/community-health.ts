import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { audit, auditCtx } from '../utils/audit';
import { whatsappEvents } from '../modules/whatsapp';
import { WHATSAPP_ENV } from '../modules/whatsapp/whatsapp-client';

const router = Router();

// GET /api/admin/communities/:id/health
router.get('/:id/health', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const community = await prisma.communities.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!community) return res.status(404).json({ success: false, error: 'Comunidade não encontrada.' });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);

    const [driversTotal, driversOnline, driversInactive, ridesCompleted, ridesNoDriver, lastOnline] = await Promise.all([
      prisma.drivers.count({ where: { community_id: id, status: 'approved' } }),
      prisma.driver_status.count({ where: { availability: 'online', driver: { community_id: id } } }),
      prisma.driver_status.count({ where: { driver: { community_id: id, status: 'approved' }, availability: { not: 'online' }, updated_at: { lt: sevenDaysAgo } } }),
      prisma.rides_v2.count({ where: { origin_community_id: id, status: 'completed', created_at: { gte: sevenDaysAgo } } }),
      prisma.rides_v2.count({ where: { origin_community_id: id, status: 'no_driver', created_at: { gte: sevenDaysAgo } } }),
      prisma.driver_status.findFirst({ where: { driver: { community_id: id }, availability: 'online' }, orderBy: { updated_at: 'desc' }, select: { updated_at: true } }),
    ]);

    const health = driversOnline > 0 ? 'active' : driversInactive > driversTotal * 0.5 ? 'weak' : 'forming';

    return res.json({
      success: true,
      data: {
        communityName: community.name,
        health,
        driversOnline,
        driversTotal,
        driversInactive7d: driversInactive,
        ridesCompleted7d: ridesCompleted,
        ridesNoDriver7d: ridesNoDriver,
        lastDriverOnlineAt: lastOnline?.updated_at || null,
      },
    });
  } catch (error: any) {
    console.error('[COMMUNITY_HEALTH]', error?.message);
    return res.status(500).json({ success: false, error: 'Erro ao buscar saúde da comunidade.' });
  }
});

// POST /api/admin/communities/:id/reactivate-drivers
router.post('/:id/reactivate-drivers', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const admin = (req as any).admin;
    const community = await prisma.communities.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!community) return res.status(404).json({ success: false, error: 'Comunidade não encontrada.' });

    if (!WHATSAPP_ENV.enabled) return res.status(503).json({ success: false, error: 'WhatsApp não configurado.' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600000);

    const inactiveDrivers = await prisma.drivers.findMany({
      where: {
        community_id: id,
        status: 'approved',
        phone: { not: null },
        driver_status: { availability: { not: 'online' }, updated_at: { lt: sevenDaysAgo } },
        OR: [
          { last_reactivation_sent_at: null },
          { last_reactivation_sent_at: { lt: fourteenDaysAgo } },
        ],
      },
      select: { id: true, name: true, phone: true },
    });

    let sent = 0;
    let skipped = 0;

    for (const driver of inactiveDrivers) {
      try {
        await whatsappEvents.driverReactivation(driver.phone!, { "1": driver.name, "2": community.name });
        await prisma.drivers.update({ where: { id: driver.id }, data: { last_reactivation_sent_at: new Date() } });
        sent++;
      } catch {
        skipped++;
      }
    }

    const ctx = auditCtx(req);
    audit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'reactivate_drivers',
      entityType: 'community',
      entityId: id,
      newValue: { sent, skipped, total: inactiveDrivers.length, communityName: community.name },
      ipAddress: ctx.ip,
    });

    return res.json({ success: true, data: { sent, skipped, total: inactiveDrivers.length } });
  } catch (error: any) {
    console.error('[REACTIVATE_DRIVERS]', error?.message);
    return res.status(500).json({ success: false, error: 'Erro ao reativar motoristas.' });
  }
});

export default router;
