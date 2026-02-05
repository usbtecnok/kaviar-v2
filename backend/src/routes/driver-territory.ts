import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  validateNeighborhoodDistance,
  getTerritoryType,
} from '../services/territory-service';
import {
  calculateBadgeProgress,
  checkAndUnlockBadges,
  getDriverBadges,
  generateRecommendation,
} from '../services/badge-service';

const router = Router();

const verifyTerritorySchema = z.object({
  neighborhoodId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  verificationMethod: z.enum(['GPS_AUTO', 'MANUAL_SELECTION']).default('GPS_AUTO'),
});

/**
 * POST /api/drivers/me/verify-territory
 * Verifica e atualiza território do motorista
 */
router.post('/me/verify-territory', async (req: Request, res: Response) => {
  try {
    // @ts-ignore - driverId vem do middleware de autenticação
    const driverId = req.driverId;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    const body = verifyTerritorySchema.parse(req.body);

    // Validar distância
    const validation = await validateNeighborhoodDistance(
      body.neighborhoodId,
      body.lat,
      body.lng
    );

    if (!validation.valid && !validation.warning) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    // Determinar tipo de território
    const territoryType = await getTerritoryType(body.neighborhoodId);

    // Atualizar motorista
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        neighborhood_id: body.neighborhoodId,
        territory_type: territoryType,
        territory_verified_at: new Date(),
        territory_verification_method: body.verificationMethod,
        // DESABILITADO: aguardando migration
        // virtual_fence_center_lat: territoryType === 'FALLBACK_800M' ? body.lat : null,
        // virtual_fence_center_lng: territoryType === 'FALLBACK_800M' ? body.lng : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        territoryType,
        warning: validation.warning,
        message: validation.message,
        distance: validation.distance,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar território',
    });
  }
});

/**
 * GET /api/drivers/me/territory-stats
 * Estatísticas de território do motorista
 */
router.get('/me/territory-stats', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const driverId = req.driverId;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    // Buscar estatísticas das últimas 4 semanas
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const stats = await prisma.driver_territory_stats.findMany({
      where: {
        driver_id: driverId,
        period_start: { gte: fourWeeksAgo },
      },
      orderBy: { period_start: 'desc' },
    });

    // Agregar totais
    const totals = stats.reduce(
      (acc, s) => ({
        totalTrips: acc.totalTrips + s.total_trips,
        insideTrips: acc.insideTrips + s.inside_territory_trips,
        adjacentTrips: acc.adjacentTrips + s.adjacent_territory_trips,
        outsideTrips: acc.outsideTrips + s.outside_territory_trips,
        potentialSavings: acc.potentialSavings + s.potential_savings_cents,
      }),
      {
        totalTrips: 0,
        insideTrips: 0,
        adjacentTrips: 0,
        outsideTrips: 0,
        potentialSavings: 0,
      }
    );

    const avgFee =
      stats.length > 0
        ? stats.reduce((sum, s) => sum + Number(s.avg_fee_percentage || 0), 0) /
          stats.length
        : 0;

    const insideRate =
      totals.totalTrips > 0 ? (totals.insideTrips / totals.totalTrips) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTrips: totals.totalTrips,
          insideTerritoryRate: Math.round(insideRate),
          avgFee: Number(avgFee.toFixed(2)),
          potentialSavings: Math.round(totals.potentialSavings / 100),
        },
        breakdown: {
          inside: totals.insideTrips,
          adjacent: totals.adjacentTrips,
          outside: totals.outsideTrips,
        },
        weekly: stats.map((s) => ({
          week: s.period_start,
          totalTrips: s.total_trips,
          insideRate:
            s.total_trips > 0
              ? Math.round((s.inside_territory_trips / s.total_trips) * 100)
              : 0,
          avgFee: Number(s.avg_fee_percentage || 0),
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas',
    });
  }
});

/**
 * GET /api/drivers/me/badges
 * Badges e conquistas do motorista
 */
router.get('/me/badges', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const driverId = req.driverId;

    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    // Verificar e desbloquear novos badges
    const newBadges = await checkAndUnlockBadges(driverId);

    // Buscar progresso de todos os badges
    const progress = await calculateBadgeProgress(driverId);

    // Buscar badges desbloqueados
    const unlocked = await getDriverBadges(driverId);

    // Gerar recomendação
    const recommendation = await generateRecommendation(driverId);

    return res.status(200).json({
      success: true,
      data: {
        unlocked,
        progress,
        newBadges,
        recommendation,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar badges',
    });
  }
});

export default router;
