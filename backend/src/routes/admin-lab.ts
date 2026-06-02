/**
 * KAVIAR Lab — Inteligência Territorial
 * Score de Maturidade Territorial — Metodologia v1 (experimental)
 *
 * Rota somente leitura. Sem escrita no banco. Sem migration.
 * Retorna apenas métricas agregadas por bairro/território.
 * Nenhum dado pessoal individual é exposto.
 *
 * Potencial científico/institucional: esta metodologia mede maturidade
 * operacional territorial e poderá servir como base para relatórios
 * institucionais, apresentações a prefeituras, associações, universidades
 * e estudos de mobilidade comunitária.
 *
 * Os pesos da v1 são experimentais e serão calibrados após observação
 * de dados reais de operação.
 */

import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
router.use(authenticateAdmin);

const VALID_DAYS = [7, 14, 30, 60, 90];
const DEFAULT_DAYS = 30;

/**
 * Score de Maturidade Territorial — Metodologia v1 (experimental)
 *
 * Componentes e pesos (sujeitos a calibração):
 *   25 pts — Densidade de motoristas aprovados (satura em 5 motoristas/bairro)
 *   20 pts — Taxa de corridas locais (corridas dentro do próprio território)
 *   20 pts — Rapidez de aceite (satura em 0 min, zera em 10 min)
 *   15 pts — Taxa de não-cancelamento
 *   10 pts — Avaliação média (apenas se ≥ 3 avaliações)
 *    5 pts — Presença de operador territorial ativo
 *    5 pts — Presença de parceiro territorial ativo
 * Total máximo: 100 pts
 */
function calcScore(d: {
  total_drivers: number;
  total_rides: number;
  local_rides: number;
  canceled_rides: number;
  avg_accept_min: number | null;
  avg_rating: number | null;
  has_operator: boolean;
  has_partner: boolean;
}): number {
  let score = 0;
  score += Math.min(d.total_drivers / 5, 1) * 25;
  const localRate = d.total_rides > 0 ? d.local_rides / d.total_rides : 0;
  score += localRate * 20;
  const acceptScore =
    d.avg_accept_min != null ? Math.max(0, 1 - d.avg_accept_min / 10) : 0;
  score += acceptScore * 20;
  const cancelRate =
    d.total_rides > 0 ? d.canceled_rides / d.total_rides : 1;
  score += (1 - cancelRate) * 15;
  if (d.avg_rating != null) {
    score += ((d.avg_rating - 1) / 4) * 10;
  }
  if (d.has_operator) score += 5;
  if (d.has_partner) score += 5;
  return Math.round(Math.min(score, 100));
}

function derivedStatus(score: number): string {
  if (score < 25) return 'Em formação';
  if (score < 50) return 'Emergindo';
  if (score < 75) return 'Operacional';
  if (score < 90) return 'Forte';
  return 'Maduro';
}

// GET /api/admin/lab/territorial-maturity?days=30
router.get('/territorial-maturity', requireRole(['SUPER_ADMIN', 'OPERATOR']), applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const rawDays = parseInt(String(req.query.days ?? DEFAULT_DAYS), 10);
    const days = VALID_DAYS.includes(rawDays) ? rawDays : DEFAULT_DAYS;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scope = (req as any).territoryScope as {
      neighborhoodIds: string[];
    } | null;

    // Filtro territorial aplicado se admin regional — SUPER_ADMIN recebe null (sem filtro)
    const nhFilter =
      scope && scope.neighborhoodIds.length > 0
        ? Prisma.sql`AND n.id = ANY(${scope.neighborhoodIds}::text[])`
        : Prisma.empty;

    const rideFilter =
      scope && scope.neighborhoodIds.length > 0
        ? Prisma.sql`AND r.origin_neighborhood_id = ANY(${scope.neighborhoodIds}::text[])`
        : Prisma.empty;

    // Query 1 — dados estruturais: bairros, motoristas, passageiros, operador, parceiro
    const structural = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      city: string;
      territory_name: string | null;
      total_drivers: bigint;
      online_drivers: bigint;
      total_passengers: bigint;
      has_operator: boolean;
      has_partner: boolean;
    }>>`
      SELECT
        n.id,
        n.name,
        n.city,
        ot.name AS territory_name,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'approved') AS total_drivers,
        COUNT(DISTINCT ds.driver_id) FILTER (WHERE ds.availability = 'online') AS online_drivers,
        COUNT(DISTINCT p.id) AS total_passengers,
        BOOL_OR(op.is_active = true) AS has_operator,
        BOOL_OR(tp.status = 'active') AS has_partner
      FROM neighborhoods n
      LEFT JOIN operational_territories ot ON ot.id = n.territory_id
      LEFT JOIN drivers d
        ON d.neighborhood_id = n.id AND d.deleted_at IS NULL
      LEFT JOIN driver_status ds ON ds.driver_id = d.id
      LEFT JOIN passengers p ON p.neighborhood_id = n.id
      LEFT JOIN operator_profiles op ON op.territory_id = n.territory_id
      LEFT JOIN territorial_partners tp ON tp.territory_id = n.territory_id
      WHERE n.is_active = true
      ${nhFilter}
      GROUP BY n.id, n.name, n.city, ot.name
    `;

    // Query 2 — métricas de corridas no período
    const rideStats = await prisma.$queryRaw<Array<{
      neighborhood_id: string;
      total_rides: bigint;
      local_rides: bigint;
      external_rides: bigint;
      canceled_rides: bigint;
      completed_rides: bigint;
      no_driver_rides: bigint;
      avg_accept_min: number | null;
      avg_trip_duration_min: number | null;
      revenue_total: number | null;
    }>>`
      SELECT
        r.origin_neighborhood_id AS neighborhood_id,
        COUNT(*) AS total_rides,
        COUNT(*) FILTER (WHERE rs.settlement_territory = 'local') AS local_rides,
        COUNT(*) FILTER (WHERE rs.settlement_territory = 'external') AS external_rides,
        COUNT(*) FILTER (
          WHERE r.status IN ('canceled_by_passenger', 'canceled_by_driver')
        ) AS canceled_rides,
        COUNT(*) FILTER (WHERE r.status = 'completed') AS completed_rides,
        COUNT(*) FILTER (WHERE r.status = 'no_driver') AS no_driver_rides,
        AVG(
          EXTRACT(EPOCH FROM (r.accepted_at - r.offered_at)) / 60.0
        ) FILTER (
          WHERE r.accepted_at IS NOT NULL AND r.offered_at IS NOT NULL
        ) AS avg_accept_min,
        AVG(
          EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) / 60.0
        ) FILTER (
          WHERE r.completed_at IS NOT NULL AND r.started_at IS NOT NULL
            AND EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) < 10800
        ) AS avg_trip_duration_min,
        COALESCE(SUM(rs.final_price) FILTER (WHERE rs.settled_at IS NOT NULL AND rs.final_price IS NOT NULL), 0) AS revenue_total
      FROM rides_v2 r
      LEFT JOIN ride_settlements rs
        ON rs.ride_id = r.id AND rs.settled_at IS NOT NULL
      WHERE r.origin_neighborhood_id IS NOT NULL
        AND r.requested_at >= ${since}
      ${rideFilter}
      GROUP BY r.origin_neighborhood_id
    `;

    // Query 3 — avaliações agregadas (mínimo 3 para exibir)
    const ratingStats = await prisma.$queryRaw<Array<{
      neighborhood_id: string;
      avg_rating: number;
      rating_count: bigint;
    }>>`
      SELECT
        sub.neighborhood_id,
        AVG(rt.rating) AS avg_rating,
        COUNT(rt.id) AS rating_count
      FROM (
        SELECT origin_neighborhood_id AS neighborhood_id, id AS ride_id
        FROM rides_v2
        WHERE requested_at >= ${since}
          AND origin_neighborhood_id IS NOT NULL
        ${rideFilter}
      ) sub
      JOIN ratings rt ON rt.ride_id = sub.ride_id
      GROUP BY sub.neighborhood_id
      HAVING COUNT(rt.id) >= 3
    `;

    // Query 4 — passageiros recorrentes (>1 corrida no período por bairro)
    const repeatStats = await prisma.$queryRaw<Array<{
      neighborhood_id: string;
      total_pax: bigint;
      repeat_pax: bigint;
    }>>`
      SELECT
        origin_neighborhood_id AS neighborhood_id,
        COUNT(DISTINCT passenger_id) AS total_pax,
        COUNT(DISTINCT passenger_id) FILTER (WHERE ride_count > 1) AS repeat_pax
      FROM (
        SELECT origin_neighborhood_id, passenger_id, COUNT(*) AS ride_count
        FROM rides_v2
        WHERE requested_at >= ${since}
          AND origin_neighborhood_id IS NOT NULL
          AND status NOT IN ('no_driver')
        ${rideFilter}
        GROUP BY origin_neighborhood_id, passenger_id
      ) sub
      GROUP BY neighborhood_id
    `;

    // Índices de lookup por neighborhood_id
    const rideMap = new Map(rideStats.map((r) => [r.neighborhood_id, r]));
    const ratingMap = new Map(ratingStats.map((r) => [r.neighborhood_id, r]));
    const repeatMap = new Map(repeatStats.map((r) => [r.neighborhood_id, r]));

    const results = structural.map((n) => {
      const rides = rideMap.get(n.id);
      const rating = ratingMap.get(n.id);
      const repeat = repeatMap.get(n.id);

      const totalDrivers = Number(n.total_drivers);
      const totalRides = Number(rides?.total_rides ?? 0);
      const localRides = Number(rides?.local_rides ?? 0);
      const externalRides = Number(rides?.external_rides ?? 0);
      const canceledRides = Number(rides?.canceled_rides ?? 0);
      const completedRides = Number(rides?.completed_rides ?? 0);
      const noDriverRides = Number(rides?.no_driver_rides ?? 0);
      const avgAcceptMin =
        rides?.avg_accept_min != null
          ? Math.round(Number(rides.avg_accept_min) * 10) / 10
          : null;
      const avgTripDurationMin =
        rides?.avg_trip_duration_min != null
          ? Math.round(Number(rides.avg_trip_duration_min) * 10) / 10
          : null;
      const revenueTotal = Math.round(Number(rides?.revenue_total ?? 0) * 100) / 100;
      const avgRating =
        rating != null
          ? Math.round(Number(rating.avg_rating) * 10) / 10
          : null;

      const totalPax = Number(repeat?.total_pax ?? 0);
      const repeatPax = Number(repeat?.repeat_pax ?? 0);
      const completionRate = totalRides > 0 ? Math.round((completedRides / totalRides) * 1000) / 10 : 0;
      const repeatPassengerPct = totalPax > 0 ? Math.round((repeatPax / totalPax) * 1000) / 10 : 0;

      const scoreInput = {
        total_drivers: totalDrivers,
        total_rides: totalRides,
        local_rides: localRides,
        canceled_rides: canceledRides,
        avg_accept_min: avgAcceptMin,
        avg_rating: avgRating,
        has_operator: n.has_operator ?? false,
        has_partner: n.has_partner ?? false,
      };

      const score = calcScore(scoreInput);

      return {
        neighborhood_id: n.id,
        neighborhood: n.name,
        city: n.city,
        territory: n.territory_name ?? 'Sem vínculo territorial',
        drivers_approved: totalDrivers,
        drivers_online: Number(n.online_drivers),
        passengers_total: Number(n.total_passengers),
        rides_total: totalRides,
        rides_local: localRides,
        rides_external: externalRides,
        rides_canceled: canceledRides,
        rides_completed: completedRides,
        rides_no_driver: noDriverRides,
        completion_rate: completionRate,
        revenue_total: revenueTotal,
        avg_accept_min: avgAcceptMin,
        avg_trip_duration_min: avgTripDurationMin,
        avg_rating: avgRating,
        has_operator: n.has_operator ?? false,
        has_partner: n.has_partner ?? false,
        repeat_passengers: repeatPax,
        repeat_passenger_pct: repeatPassengerPct,
        maturity_score: score,
        maturity_status: derivedStatus(score),
      };
    });

    // Ordenar por score descrescente para facilitar leitura no painel
    results.sort((a, b) => b.maturity_score - a.maturity_score);

    return res.json({
      success: true,
      meta: {
        period_days: days,
        since: since.toISOString(),
        total_neighborhoods: results.length,
        methodology: 'v1-experimental',
        methodology_note:
          'Score de Maturidade Territorial — pesos experimentais, sujeitos a calibração após observação dos dados reais de operação.',
      },
      data: results,
    });
  } catch (err) {
    console.error('[admin-lab] erro ao calcular maturidade territorial');
    return res.status(500).json({ success: false, error: 'Erro ao calcular métricas territoriais' });
  }
});

export default router;
