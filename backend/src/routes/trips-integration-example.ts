/**
 * EXEMPLO DE INTEGRAÇÃO DO FEE CALCULATION
 * 
 * Este arquivo mostra como integrar o sistema de cálculo de taxa
 * nas rotas de criação de corridas.
 * 
 * Use este código como referência para atualizar suas rotas existentes.
 */

import { Router, Request, Response } from 'express';
import { calculateTripFee, logFeeCalculation } from '../services/fee-calculation';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * EXEMPLO 1: Estimativa de corrida (ANTES de criar)
 * 
 * O passageiro vê quanto vai custar e qual a taxa ANTES de confirmar
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const {
      driverId,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      estimatedFare // Valor estimado da corrida
    } = req.body;

    // Validação básica
    if (!driverId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng || !estimatedFare) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios faltando'
      });
    }

    // Calcular taxa usando o sistema Kaviar
    const feeCalc = await calculateTripFee(
      driverId,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      Number(estimatedFare)
    );

    // Retornar estimativa completa
    res.json({
      success: true,
      data: {
        estimatedFare: Number(estimatedFare),
        platformFee: {
          percentage: feeCalc.feePercentage,
          amount: feeCalc.feeAmount,
          type: feeCalc.matchType
        },
        driverEarnings: feeCalc.driverEarnings,
        breakdown: {
          reason: feeCalc.reason,
          pickup: feeCalc.pickupNeighborhood,
          dropoff: feeCalc.dropoffNeighborhood,
          driverHome: feeCalc.driverHomeNeighborhood
        }
      }
    });

  } catch (error: any) {
    console.error('Erro ao estimar corrida:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular estimativa'
    });
  }
});

/**
 * EXEMPLO 2: Criar corrida (COM cálculo automático de taxa)
 * 
 * Ao criar a corrida, o sistema calcula e salva a taxa automaticamente
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      driverId,
      passengerId,
      pickupLat,
      pickupLng,
      pickupAddress,
      dropoffLat,
      dropoffLng,
      dropoffAddress,
      fareAmount
    } = req.body;

    // 1. Calcular taxa ANTES de criar a corrida
    const feeCalc = await calculateTripFee(
      driverId,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      Number(fareAmount)
    );

    // 2. Criar corrida com taxa calculada
    const trip = await prisma.trips.create({
      data: {
        driver_id: driverId,
        passenger_id: passengerId,
        pickup_lat: Number(pickupLat),
        pickup_lng: Number(pickupLng),
        pickup_address: pickupAddress,
        dropoff_lat: Number(dropoffLat),
        dropoff_lng: Number(dropoffLng),
        dropoff_address: dropoffAddress,
        fare_amount: Number(fareAmount),
        platform_fee_percentage: feeCalc.feePercentage,
        platform_fee_amount: feeCalc.feeAmount,
        driver_earnings: feeCalc.driverEarnings,
        match_type: feeCalc.matchType,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // 3. Registrar no log para analytics
    await logFeeCalculation(trip.id, driverId, feeCalc);

    // 4. Retornar corrida criada
    res.json({
      success: true,
      data: {
        trip: {
          id: trip.id,
          fareAmount: trip.fare_amount,
          platformFee: {
            percentage: trip.platform_fee_percentage,
            amount: trip.platform_fee_amount,
            type: trip.match_type
          },
          driverEarnings: trip.driver_earnings,
          status: trip.status
        },
        feeDetails: {
          reason: feeCalc.reason,
          neighborhoods: {
            pickup: feeCalc.pickupNeighborhood,
            dropoff: feeCalc.dropoffNeighborhood,
            driverHome: feeCalc.driverHomeNeighborhood
          }
        }
      }
    });

  } catch (error: any) {
    console.error('Erro ao criar corrida:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar corrida'
    });
  }
});

/**
 * EXEMPLO 3: Atualizar corrida existente (recalcular taxa)
 * 
 * Se o destino mudar, recalcula a taxa
 */
router.patch('/:tripId/update-destination', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { dropoffLat, dropoffLng, dropoffAddress } = req.body;

    // 1. Buscar corrida existente
    const trip: any = await prisma.trips.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Corrida não encontrada'
      });
    }

    // 2. Recalcular taxa com novo destino
    const feeCalc = await calculateTripFee(
      trip.driver_id,
      Number(trip.pickup_lat),
      Number(trip.pickup_lng),
      Number(dropoffLat),
      Number(dropoffLng),
      Number(trip.fare_amount)
    );

    // 3. Atualizar corrida
    const updatedTrip = await prisma.trips.update({
      where: { id: tripId },
      data: {
        dropoff_lat: Number(dropoffLat),
        dropoff_lng: Number(dropoffLng),
        dropoff_address: dropoffAddress,
        platform_fee_percentage: feeCalc.feePercentage,
        platform_fee_amount: feeCalc.feeAmount,
        driver_earnings: feeCalc.driverEarnings,
        match_type: feeCalc.matchType,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        trip: updatedTrip,
        feeChanged: trip.platform_fee_percentage !== feeCalc.feePercentage,
        oldFee: trip.platform_fee_percentage,
        newFee: feeCalc.feePercentage,
        reason: feeCalc.reason
      }
    });

  } catch (error: any) {
    console.error('Erro ao atualizar destino:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar destino'
    });
  }
});

/**
 * EXEMPLO 4: Mostrar economia do motorista
 * 
 * Dashboard mostrando quanto o motorista economizou vs Uber (25%)
 */
router.get('/driver/:driverId/savings', async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;

    // Buscar todas as corridas do período
    const trips: any[] = await prisma.trips.findMany({
      where: {
        driver_id: driverId,
        created_at: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      }
    });

    // Calcular economia vs Uber (25%)
    const UBER_FEE = 25;
    let totalFareAmount = 0;
    let totalKaviarFee = 0;
    let totalUberFee = 0;

    trips.forEach(trip => {
      const fare = Number(trip.fare_amount);
      totalFareAmount += fare;
      totalKaviarFee += Number(trip.platform_fee_amount);
      totalUberFee += (fare * UBER_FEE) / 100;
    });

    const savings = totalUberFee - totalKaviarFee;
    const savingsPercentage = totalFareAmount > 0 
      ? ((savings / totalFareAmount) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          totalTrips: trips.length
        },
        earnings: {
          totalFareAmount: totalFareAmount.toFixed(2),
          kaviarFee: totalKaviarFee.toFixed(2),
          driverEarnings: (totalFareAmount - totalKaviarFee).toFixed(2)
        },
        comparison: {
          uberFee: totalUberFee.toFixed(2),
          kaviarFee: totalKaviarFee.toFixed(2),
          savings: savings.toFixed(2),
          savingsPercentage: `${savingsPercentage}%`
        },
        message: `Você economizou R$ ${savings.toFixed(2)} vs Uber!`
      }
    });

  } catch (error: any) {
    console.error('Erro ao calcular economia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao calcular economia'
    });
  }
});

export default router;
