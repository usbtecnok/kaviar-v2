import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, allowReadAccess } from '../middlewares/auth';
import { pool } from '../db';

const router = Router();
const prisma = new PrismaClient();

// Auth obrigatório para todas as rotas do dashboard
router.use(authenticateAdmin, allowReadAccess);

// GET /api/admin/dashboard/overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      pendingDrivers,
      totalPassengers,
      totalRides,
      totalNeighborhoods,
      activeNeighborhoods,
      neighborhoodsByCity
    ] = await Promise.all([
      prisma.drivers.count(),
      prisma.drivers.count({ where: { status: 'APPROVED' } }),
      prisma.drivers.count({ where: { status: 'PENDING' } }),
      prisma.passengers.count(),
      prisma.rides_v2.count(), // corridas reais (v2)
      prisma.neighborhoods.count(),
      prisma.neighborhoods.count({ where: { is_active: true } }),
      prisma.$queryRaw<Array<{ city: string; count: bigint }>>`
        SELECT city, COUNT(*) as count 
        FROM neighborhoods 
        GROUP BY city
      `
    ]);

    const cityCounts = neighborhoodsByCity.reduce((acc: Record<string, number>, row: any) => {
      acc[row.city] = Number(row.count);
      return acc;
    }, {});

    res.json({
      drivers: totalDrivers,
      activeDrivers,
      passengers: totalPassengers,
      rides: totalRides,
      communities: totalNeighborhoods,
      activeCommunities: activeNeighborhoods,
      neighborhoodsByCity: cityCounts,
      guides: 0,
      pending: {
        drivers: pendingDrivers,
        guides: 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/admin/dashboard/territory
router.get('/territory', async (req: Request, res: Response) => {
  try {
    const [total, homebound, local, adjacent, external, homeboundReduced] = await Promise.all([
      prisma.rides_v2.count({ where: { status: 'completed' } }),
      prisma.rides_v2.count({ where: { status: 'completed', is_homebound: true } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'local' } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'adjacent' } }),
      prisma.rides_v2.count({ where: { status: 'completed', territory_match: 'external' } }),
      prisma.rides_v2.count({ where: { status: 'completed', is_homebound: true, territory_match: { in: ['local', 'adjacent'] } } }),
    ]);
    res.json({ success: true, data: { total, homebound, local, adjacent, external, homeboundReduced } });
  } catch (error) {
    console.error('[DASHBOARD_TERRITORY_ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch territory metrics' });
  }
});

/**
 * GET /api/admin/dashboard/operations?period=today|7d|30d
 *
 * Agrega métricas operacionais do período. Leitura pura.
 *
 * wait_charge_estimated:
 *   Calculado como SUM(final_price - locked_price)
 *   apenas para corridas com wait_requested=true, wait_ended_at IS NOT NULL
 *   e driver_adjustment IS NULL.
 *   Isso isola o wait_charge sem misturar ajuste do motorista.
 *   Nomeado "estimated" porque depende de locked_price como proxy do quoted_price.
 */
router.get('/operations', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const since = new Date();
    if (period === 'today') {
      since.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setDate(since.getDate() - 30);
    }

    const [
      ridesCompleted,
      ridesCanceled,
      ridesNoDriver,
      ridesWithWait,
      ridesWithAdjustment,
      adjustmentsAccepted,
    ] = await Promise.all([
      prisma.rides_v2.count({ where: { status: 'completed', completed_at: { gte: since } } }),
      prisma.rides_v2.count({ where: { status: { in: ['canceled_by_passenger', 'canceled_by_driver'] }, requested_at: { gte: since } } }),
      prisma.rides_v2.count({ where: { status: 'no_driver', requested_at: { gte: since } } }),
      prisma.rides_v2.count({ where: { status: 'completed', wait_requested: true, wait_ended_at: { not: null }, completed_at: { gte: since } } }),
      prisma.rides_v2.count({ where: { status: 'completed', driver_adjustment: { not: null }, completed_at: { gte: since } } }),
      prisma.rides_v2.count({ where: { status: 'completed', adjusted_price: { not: null }, completed_at: { gte: since } } }),
    ]);

    // Financials from ride_settlements (source of truth)
    const financials = await pool.query<{
      gross_total: string;
      credits_consumed: string;
      wait_charge_estimated: string;
    }>(`
      SELECT
        COALESCE(SUM(rs.final_price), 0)::text                                    AS gross_total,
        COALESCE(SUM(rs.credit_cost), 0)::text                                    AS credits_consumed,
        COALESCE(SUM(
          CASE WHEN r.wait_requested = true
               AND r.wait_ended_at IS NOT NULL
               AND r.driver_adjustment IS NULL
          THEN rs.final_price - rs.locked_price
          ELSE 0 END
        ), 0)::text                                                                AS wait_charge_estimated
      FROM ride_settlements rs
      JOIN rides_v2 r ON r.id = rs.ride_id
      WHERE rs.settled_at >= $1
    `, [since]);

    const fin = financials.rows[0];
    const grossTotal = parseFloat(fin.gross_total);
    const creditsConsumed = parseInt(fin.credits_consumed, 10);
    const waitChargeEstimated = parseFloat(fin.wait_charge_estimated);

    // Wait duration stats
    const waitStats = await pool.query<{ avg_min: string; total_min: string }>(`
      SELECT
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (wait_ended_at - wait_started_at)) / 60
        ), 0)::text AS avg_min,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (wait_ended_at - wait_started_at)) / 60
        ), 0)::text AS total_min
      FROM rides_v2
      WHERE status = 'completed'
        AND wait_requested = true
        AND wait_started_at IS NOT NULL
        AND wait_ended_at IS NOT NULL
        AND completed_at >= $1
    `, [since]);

    const avgWaitMin = Math.round(parseFloat(waitStats.rows[0].avg_min) * 10) / 10;
    const totalWaitMin = Math.round(parseFloat(waitStats.rows[0].total_min));

    // Territory breakdown
    const territory = await pool.query<{ territory: string; count: string }>(`
      SELECT settlement_territory AS territory, COUNT(*)::text AS count
      FROM ride_settlements rs
      JOIN rides_v2 r ON r.id = rs.ride_id
      WHERE rs.settled_at >= $1
      GROUP BY settlement_territory
    `, [since]);

    const territoryMap: Record<string, number> = { local: 0, adjacent: 0, external: 0 };
    for (const row of territory.rows) {
      if (row.territory) territoryMap[row.territory] = parseInt(row.count, 10);
    }

    // Top neighborhoods by origin
    const topNeighborhoods = await pool.query<{ name: string; rides: string }>(`
      SELECT n.name, COUNT(r.id)::text AS rides
      FROM rides_v2 r
      JOIN neighborhoods n ON n.id = r.origin_neighborhood_id
      WHERE r.status = 'completed' AND r.completed_at >= $1
      GROUP BY n.name
      ORDER BY rides DESC
      LIMIT 10
    `, [since]);

    // Top drivers
    const topDrivers = await pool.query<{ name: string; rides: string; credits: string; wait_min: string }>(`
      SELECT
        d.name,
        COUNT(r.id)::text                                                          AS rides,
        COALESCE(SUM(rs.credit_cost), 0)::text                                    AS credits,
        COALESCE(SUM(
          CASE WHEN r.wait_started_at IS NOT NULL AND r.wait_ended_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (r.wait_ended_at - r.wait_started_at)) / 60
          ELSE 0 END
        ), 0)::text                                                                AS wait_min
      FROM rides_v2 r
      JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN ride_settlements rs ON rs.ride_id = r.id
      WHERE r.status = 'completed' AND r.completed_at >= $1
      GROUP BY d.id, d.name
      ORDER BY rides DESC
      LIMIT 10
    `, [since]);

    res.json({
      success: true,
      period,
      since: since.toISOString(),
      data: {
        rides: {
          completed: ridesCompleted,
          canceled: ridesCanceled,
          no_driver: ridesNoDriver,
          with_wait: ridesWithWait,
          with_adjustment: ridesWithAdjustment,
          adjustments_accepted: adjustmentsAccepted,
        },
        financials: {
          gross_total: grossTotal,
          credits_consumed: creditsConsumed,
          platform_revenue_credits: creditsConsumed * 2,
          // Fórmula: SUM(final_price - locked_price) WHERE wait_requested=true
          // AND wait_ended_at IS NOT NULL AND driver_adjustment IS NULL
          wait_charge_estimated: waitChargeEstimated,
        },
        wait: {
          avg_minutes: avgWaitMin,
          total_minutes: totalWaitMin,
        },
        territory: territoryMap,
        top_neighborhoods: topNeighborhoods.rows.map(r => ({
          name: r.name,
          rides: parseInt(r.rides, 10),
        })),
        top_drivers: topDrivers.rows.map(r => ({
          name: r.name,
          rides: parseInt(r.rides, 10),
          credits: parseInt(r.credits, 10),
          wait_min: Math.round(parseFloat(r.wait_min)),
        })),
      },
    });
  } catch (error: any) {
    console.error('[DASHBOARD_OPERATIONS_ERROR]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
