import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
const VALID_DAYS = [7, 30, 90];

// GET /api/admin/manager/women-coverage?days=30
router.get('/', authenticateAdmin, requireRole(['SUPER_ADMIN', 'TERRITORIAL_MANAGER']), applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;

    // Territorial: empty scope = empty response (never global for non-SA)
    if (admin.role !== 'SUPER_ADMIN' && (!scope || !scope.neighborhoodIds || scope.neighborhoodIds.length === 0)) {
      return res.json({ success: true, data: { totals: { drivers_eligible_display: '0', drivers_eligible_suppressed: false, drivers_opt_in_display: '0', drivers_opt_in_suppressed: false, drivers_matching_ready_display: '0', drivers_matching_ready_suppressed: false, rides_with_preference: 0, rides_completed: 0, rides_no_driver: 0, attendance_rate: 0 }, by_neighborhood: [], period_days: 30 } });
    }

    const rawDays = parseInt(String(req.query.days ?? 30), 10);
    if (!VALID_DAYS.includes(rawDays)) return res.status(400).json({ success: false, error: 'Período inválido. Use 7, 30 ou 90.' });
    const since = new Date(Date.now() - rawDays * 24 * 60 * 60 * 1000);

    const nhFilter = scope && scope.neighborhoodIds.length > 0
      ? Prisma.sql`AND d.neighborhood_id = ANY(${scope.neighborhoodIds}::text[])`
      : Prisma.empty;
    const rideNhFilter = scope && scope.neighborhoodIds.length > 0
      ? Prisma.sql`AND r.origin_neighborhood_id = ANY(${scope.neighborhoodIds}::text[])`
      : Prisma.empty;
    const nFilter = scope && scope.neighborhoodIds.length > 0
      ? Prisma.sql`WHERE n.id = ANY(${scope.neighborhoodIds}::text[]) AND n.is_active = true`
      : Prisma.sql`WHERE n.is_active = true`;

    // Totals: drivers (separate query, no joins)
    const driverTotals = await prisma.$queryRaw<[{ eligible: bigint; opt_in: bigint; matching_ready: bigint }]>`
      SELECT
        COUNT(*) FILTER (WHERE d.women_preference_eligible = true) AS eligible,
        COUNT(*) FILTER (WHERE d.women_matching_opt_in = true) AS opt_in,
        COUNT(*) FILTER (WHERE d.women_preference_eligible = true AND d.women_matching_opt_in = true) AS matching_ready
      FROM drivers d
      WHERE d.deleted_at IS NULL AND d.status = 'approved'
      ${nhFilter}
    `;

    // Totals: rides (separate query, no joins)
    const rideTotals = await prisma.$queryRaw<[{ total: bigint; completed: bigint; no_driver: bigint }]>`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE r.status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE r.status = 'no_driver') AS no_driver
      FROM rides_v2 r
      WHERE r.prefer_woman_driver = true AND r.requested_at >= ${since}
      ${rideNhFilter}
    `;

    const driversEligible = Number(driverTotals[0]?.eligible ?? 0);
    const driversOptIn = Number(driverTotals[0]?.opt_in ?? 0);
    const driversMatchingReady = Number(driverTotals[0]?.matching_ready ?? 0);
    const ridesTotal = Number(rideTotals[0]?.total ?? 0);
    const ridesCompleted = Number(rideTotals[0]?.completed ?? 0);
    const ridesNoDriver = Number(rideTotals[0]?.no_driver ?? 0);
    const denom = ridesCompleted + ridesNoDriver;
    const attendanceRate = denom > 0 ? Math.round((ridesCompleted / denom) * 1000) / 10 : 0;

    // Privacy: suppress counts of people < 3
    const suppress = (n: number) => ({ display: n === 0 ? '0' : n < 3 ? '< 3' : String(n), suppressed: n > 0 && n < 3 });

    // By neighborhood: pre-aggregated CTEs joined to neighborhoods
    const byNh = await prisma.$queryRaw<Array<{ id: string; name: string; d_matching: bigint; r_pref: bigint; r_done: bigint; r_nd: bigint }>>`
      WITH driver_stats AS (
        SELECT d.neighborhood_id, 
          COUNT(*) FILTER (WHERE d.women_preference_eligible = true AND d.women_matching_opt_in = true) AS matching_ready
        FROM drivers d
        WHERE d.deleted_at IS NULL AND d.status = 'approved' AND d.neighborhood_id IS NOT NULL
        ${nhFilter}
        GROUP BY d.neighborhood_id
      ),
      ride_stats AS (
        SELECT r.origin_neighborhood_id,
          COUNT(*) AS rides_pref,
          COUNT(*) FILTER (WHERE r.status = 'completed') AS rides_done,
          COUNT(*) FILTER (WHERE r.status = 'no_driver') AS rides_nd
        FROM rides_v2 r
        WHERE r.prefer_woman_driver = true AND r.requested_at >= ${since}
        ${rideNhFilter}
        GROUP BY r.origin_neighborhood_id
      )
      SELECT n.id, n.name,
        COALESCE(ds.matching_ready, 0) AS d_matching,
        COALESCE(rs.rides_pref, 0) AS r_pref,
        COALESCE(rs.rides_done, 0) AS r_done,
        COALESCE(rs.rides_nd, 0) AS r_nd
      FROM neighborhoods n
      LEFT JOIN driver_stats ds ON ds.neighborhood_id = n.id
      LEFT JOIN ride_stats rs ON rs.origin_neighborhood_id = n.id
      ${nFilter}
        AND (ds.matching_ready > 0 OR rs.rides_pref > 0)
      ORDER BY n.name
    `;

    const neighborhoods = byNh.map(row => {
      const s = suppress(Number(row.d_matching));
      return {
        neighborhood_id: row.id,
        neighborhood: row.name,
        drivers_matching_ready_display: s.display,
        drivers_matching_ready_suppressed: s.suppressed,
        rides_with_preference: Number(row.r_pref),
        rides_completed: Number(row.r_done),
        rides_no_driver: Number(row.r_nd),
      };
    });

    const eligS = suppress(driversEligible);
    const optS = suppress(driversOptIn);
    const matchS = suppress(driversMatchingReady);

    res.json({
      success: true,
      data: {
        totals: {
          drivers_eligible_display: eligS.display, drivers_eligible_suppressed: eligS.suppressed,
          drivers_opt_in_display: optS.display, drivers_opt_in_suppressed: optS.suppressed,
          drivers_matching_ready_display: matchS.display, drivers_matching_ready_suppressed: matchS.suppressed,
          rides_with_preference: ridesTotal, rides_completed: ridesCompleted, rides_no_driver: ridesNoDriver, attendance_rate: attendanceRate,
        },
        by_neighborhood: neighborhoods,
        period_days: rawDays,
      },
    });
  } catch (error) {
    console.error('[manager-women-coverage] error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao calcular indicadores.' });
  }
});

export default router;
