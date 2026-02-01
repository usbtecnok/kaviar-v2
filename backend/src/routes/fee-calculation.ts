import { Router, Request, Response } from 'express';
import { calculateTripFee, calculateFeePercentage, getDriverFeeStats } from '../services/fee-calculation';

const router = Router();

/**
 * POST /api/trips/estimate-fee
 * Estima a taxa de uma corrida antes de ser criada
 */
router.post('/estimate-fee', async (req: Request, res: Response) => {
  try {
    const {
      driverId,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      fareAmount,
      city = 'São Paulo'
    } = req.body;

    // Validação
    if (!driverId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !fareAmount) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: driverId, pickupLat, pickupLng, dropoffLat, dropoffLng, fareAmount'
      });
    }

    const calculation = await calculateTripFee(
      driverId,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      Number(fareAmount),
      city
    );

    res.json({
      success: true,
      data: {
        fareAmount: Number(fareAmount),
        feePercentage: calculation.feePercentage,
        feeAmount: calculation.feeAmount.toFixed(2),
        driverEarnings: calculation.driverEarnings.toFixed(2),
        matchType: calculation.matchType,
        reason: calculation.reason,
        neighborhoods: {
          pickup: calculation.pickupNeighborhood,
          dropoff: calculation.dropoffNeighborhood,
          driverHome: calculation.driverHomeNeighborhood
        }
      }
    });
  } catch (error: any) {
    console.error('Erro ao estimar taxa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular taxa da corrida'
    });
  }
});

/**
 * GET /api/trips/fee-percentage
 * Retorna apenas o percentual de taxa (mais rápido)
 */
router.get('/fee-percentage', async (req: Request, res: Response) => {
  try {
    const { driverId, pickupLat, pickupLng, dropoffLat, dropoffLng, city = 'São Paulo' } = req.query;

    if (!driverId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: driverId, pickupLat, pickupLng, dropoffLat, dropoffLng'
      });
    }

    const result = await calculateFeePercentage(
      driverId as string,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      city as string
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Erro ao calcular percentual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular percentual de taxa'
    });
  }
});

/**
 * GET /api/drivers/:driverId/fee-stats
 * Estatísticas de taxas do motorista
 */
router.get('/:driverId/fee-stats', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await getDriverFeeStats(
      driverId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de taxas'
    });
  }
});

export default router;
