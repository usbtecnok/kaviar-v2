import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { calculateBadgeProgress, generateRecommendation } from '../services/badge-service';

const router = Router();

/**
 * GET /api/drivers/:driverId/dashboard
 * Dashboard completo do motorista com estatísticas de taxa
 */
router.get('/:driverId/dashboard', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { period = '30' } = req.query; // dias

    const daysAgo = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // 1. Buscar motorista e bairro base
    const driver: any = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        neighborhood_id: true,
        territory_type: true,
        territory_verified_at: true,
        neighborhoods: {
          select: {
            id: true,
            name: true,
            city: true,
            neighborhood_geofences: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    const driverHomeNeighborhood = driver.neighborhoods;

    // 2. Buscar corridas do período
    const trips: any[] = await prisma.$queryRaw`
      SELECT 
        id,
        price as fare_amount,
        platform_fee_percentage,
        platform_fee as platform_fee_amount,
        match_type,
        created_at
      FROM rides
      WHERE driver_id = ${driverId}
        AND created_at >= ${startDate}
        AND status IN ('completed', 'finished')
      ORDER BY created_at DESC
    `;

    // 3. Calcular estatísticas
    const totalTrips = trips.length;
    const totalFare = trips.reduce((sum, t) => sum + Number(t.fare_amount), 0);
    const totalKaviarFee = trips.reduce((sum, t) => sum + Number(t.platform_fee_amount), 0);
    const totalEarnings = totalFare - totalKaviarFee;
    const avgFeePercentage = totalTrips > 0 
      ? trips.reduce((sum, t) => sum + Number(t.platform_fee_percentage), 0) / totalTrips 
      : 0;

    // 4. Breakdown por tipo de match
    const matchBreakdown = {
      SAME_NEIGHBORHOOD: trips.filter(t => t.match_type === 'SAME_NEIGHBORHOOD').length,
      ADJACENT_NEIGHBORHOOD: trips.filter(t => t.match_type === 'ADJACENT_NEIGHBORHOOD').length,
      OUTSIDE_FENCE: trips.filter(t => t.match_type === 'OUTSIDE_FENCE').length
    };

    const inNeighborhoodPercentage = totalTrips > 0
      ? ((matchBreakdown.SAME_NEIGHBORHOOD / totalTrips) * 100).toFixed(1)
      : 0;

    // 5. Comparação com Uber (25%)
    const UBER_FEE = 25;
    const uberFeeAmount = (totalFare * UBER_FEE) / 100;
    const savings = uberFeeAmount - totalKaviarFee;
    const savingsPercentage = totalFare > 0 
      ? ((savings / totalFare) * 100).toFixed(1)
      : 0;

    // 6. Últimas corridas
    const recentTrips = trips.slice(0, 5).map(t => ({
      id: t.id,
      fare: Number(t.fare_amount).toFixed(2),
      fee: `${Number(t.platform_fee_percentage)}%`,
      matchType: t.match_type,
      date: t.created_at
    }));

    // 7. Status da cerca virtual e território
    const hasGeofence = !!driverHomeNeighborhood?.neighborhood_geofences;
    const territoryInfo = {
      type: driver.territory_type || null,
      neighborhood: driverHomeNeighborhood,
      hasOfficialMap: hasGeofence,
      virtualRadius: !hasGeofence ? 800 : null,
      minFee: hasGeofence ? 7 : 12,
      maxFee: 20,
      message: !hasGeofence 
        ? 'Seu território usa cerca virtual de 800m. Faça corridas próximas para manter taxa de 12%.'
        : 'Seu território tem mapa oficial. Taxa mínima de 7% para corridas no bairro.',
      verifiedAt: driver.territory_verified_at
    };

    const fenceStatus = {
      active: !!driver.neighborhood_id,
      neighborhood: driverHomeNeighborhood,
      inNeighborhoodRate: `${inNeighborhoodPercentage}%`,
      recommendation: Number(inNeighborhoodPercentage) < 50 
        ? 'Tente fazer mais corridas no seu bairro para economizar!'
        : 'Ótimo! Você está aproveitando bem sua cerca virtual.'
    };

    // 8. Buscar badges e recomendações
    const badges = await calculateBadgeProgress(driverId);
    const recommendation = await generateRecommendation(driverId);

    // Resposta
    res.json({
      success: true,
      data: {
        period: {
          days: daysAgo,
          startDate,
          endDate: new Date()
        },
        driver: {
          id: driver.id,
          name: driver.name,
          homeNeighborhood: driverHomeNeighborhood
        },
        territoryInfo,
        summary: {
          totalTrips,
          totalFare: totalFare.toFixed(2),
          totalEarnings: totalEarnings.toFixed(2),
          avgFeePercentage: avgFeePercentage.toFixed(1)
        },
        comparison: {
          kaviar: {
            fee: totalKaviarFee.toFixed(2),
            percentage: avgFeePercentage.toFixed(1)
          },
          uber: {
            fee: uberFeeAmount.toFixed(2),
            percentage: UBER_FEE
          },
          savings: {
            amount: savings.toFixed(2),
            percentage: savingsPercentage,
            message: savings > 0 
              ? `Você economizou R$ ${savings.toFixed(2)} vs Uber!`
              : 'Faça mais corridas no seu bairro para economizar.'
          }
        },
        matchBreakdown: {
          sameNeighborhood: {
            count: matchBreakdown.SAME_NEIGHBORHOOD,
            percentage: totalTrips > 0 
              ? ((matchBreakdown.SAME_NEIGHBORHOOD / totalTrips) * 100).toFixed(1)
              : 0,
            fee: '7%'
          },
          adjacentNeighborhood: {
            count: matchBreakdown.ADJACENT_NEIGHBORHOOD,
            percentage: totalTrips > 0 
              ? ((matchBreakdown.ADJACENT_NEIGHBORHOOD / totalTrips) * 100).toFixed(1)
              : 0,
            fee: '12%'
          },
          outsideFence: {
            count: matchBreakdown.OUTSIDE_FENCE,
            percentage: totalTrips > 0 
              ? ((matchBreakdown.OUTSIDE_FENCE / totalTrips) * 100).toFixed(1)
              : 0,
            fee: '20%'
          }
        },
        fenceStatus,
        badges: badges.filter(b => b.unlocked).slice(0, 3),
        recommendation,
        recentTrips
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar dashboard'
    });
  }
});

export default router;
