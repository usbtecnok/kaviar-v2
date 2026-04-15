import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { dispatcherService } from '../services/dispatcher.service';
import { resolveTerritory } from '../services/territory-resolver.service';
import { Decimal } from '@prisma/client/runtime/library';
import { realTimeService } from '../services/realtime.service';
import { calculateCreditCost } from '../services/credit-cost.service';
import { applyCreditDelta } from '../services/credit.service';
import { whatsappEvents } from '../modules/whatsapp';
import * as pricingEngine from '../services/pricing-engine';
import { authenticatePassenger, authenticateDriver, requireAuth } from '../middlewares/auth';

const router = Router();

// 5.0 Estimativa de preço (sem criar corrida)
router.post('/estimate', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const { origin, destination } = req.body;
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'Origem ou destino inválido' });
    }

    const distance_km = Math.round(
      pricingEngine.haversineKm(origin.lat, origin.lng, destination.lat, destination.lng) * 100
    ) / 100;

    const profile = await pricingEngine.resolveProfile(origin.lat, origin.lng);
    const raw = profile.base_fare + distance_km * profile.per_km;
    const price = Math.round(Math.max(raw, profile.minimum_fare) * 100) / 100;

    res.json({ success: true, data: { price, distance_km } });
  } catch (error: any) {
    console.error('[RIDE_ESTIMATE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.1 Passageiro solicita corrida
router.post('/', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { origin, destination, type = 'normal' } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // Validação
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'Origem ou destino inválido' });
    }

    // Verificar idempotência
    if (idempotencyKey) {
      const existing = await prisma.rides_v2.findFirst({
        where: {
          passenger_id: passengerId,
          idempotency_key: idempotencyKey
        }
      });
      if (existing) {
        return res.json({ success: true, data: { ride_id: existing.id, status: existing.status } });
      }
    }

    // Criar corrida
    const passengerAppVersion = req.headers['x-app-version'] as string || null;
    const ride = await prisma.rides_v2.create({
      data: {
        passenger_id: passengerId,
        passenger_app_version: passengerAppVersion,
        origin_lat: new Decimal(origin.lat),
        origin_lng: new Decimal(origin.lng),
        origin_text: origin.text,
        dest_lat: new Decimal(destination.lat),
        dest_lng: new Decimal(destination.lng),
        destination_text: destination.text,
        ride_type: type,
        idempotency_key: idempotencyKey,
        status: 'requested'
      }
    });

    console.log(`[RIDE_CREATED] ride_id=${ride.id} passenger_id=${passengerId} origin=[${origin.lat},${origin.lng}] dest=[${destination.lat},${destination.lng}]`);

    // Resolver território origem + destino via geofence (comunidade → bairro → fallback)
    let originNeighborhoodId: string | null = null;
    let originCommunityId: string | null = null;
    let destNeighborhoodId: string | null = null;
    try {
      const [originRes, destRes] = await Promise.all([
        resolveTerritory(origin.lng, origin.lat),
        resolveTerritory(destination.lng, destination.lat),
      ]);
      if (originRes.neighborhood) {
        originNeighborhoodId = originRes.neighborhood.id;
      }
      if (originRes.community) {
        originCommunityId = originRes.community.id;
      }
      if (destRes.neighborhood) {
        destNeighborhoodId = destRes.neighborhood.id;
      }

      // Detectar corrida de retorno para casa
      const passenger = await prisma.passengers.findUnique({
        where: { id: passengerId },
        select: { neighborhood_id: true, community_id: true }
      });
      const isHomebound = !!(passenger && destNeighborhoodId &&
        passenger.neighborhood_id === destNeighborhoodId &&
        originNeighborhoodId !== passenger.neighborhood_id);

      await prisma.rides_v2.update({
        where: { id: ride.id },
        data: {
          origin_neighborhood_id: originNeighborhoodId,
          origin_community_id: originCommunityId,
          dest_neighborhood_id: destNeighborhoodId,
          is_homebound: isHomebound,
        }
      });
      console.log(`[RIDE_TERRITORY] ride_id=${ride.id} origin_neighborhood=${originNeighborhoodId} origin_community=${originCommunityId} dest_neighborhood=${destNeighborhoodId} homebound=${isHomebound}`);
    } catch (geoErr) {
      console.error(`[RIDE_GEO_RESOLVE_FAILED] ride_id=${ride.id}`, geoErr);
    }

    // Pricing: quote + lock (V1: confirmação implícita)
    let quoteResult: any = null;
    try {
      quoteResult = await pricingEngine.quote(
        ride.id, origin.lat, origin.lng, destination.lat, destination.lng,
        originNeighborhoodId, destNeighborhoodId
      );
    } catch (priceErr) {
      console.error(`[PRICING_QUOTE_FAILED] ride_id=${ride.id}`, priceErr);
    }

    // Acionar dispatcher (async, não bloqueia resposta)
    setImmediate(() => dispatcherService.dispatchRide(ride.id).catch(err => {
      console.error(`[DISPATCH_FIRE_FORGET_ERROR] ride_id=${ride.id}`, err);
      prisma.rides_v2.update({ where: { id: ride.id }, data: { status: 'no_driver' } }).catch(() => {});
    }));

    res.json({
      success: true,
      data: {
        ride_id: ride.id,
        status: ride.status,
        quoted_price: quoteResult?.quoted_price ?? null,
        territory: quoteResult?.route_territory ?? null,
      }
    });
  } catch (error: any) {
    console.error('[RIDE_CREATE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.1b Passageiro responde ao ajuste de valor
router.post('/:ride_id/adjustment-response', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { ride_id } = req.params;
    const { accept } = req.body;

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Campo "accept" (boolean) é obrigatório' });
    }

    const ride = await prisma.rides_v2.findUnique({
      where: { id: ride_id },
      include: { offers: { where: { status: 'accepted', adjustment_status: 'pending' }, take: 1 } }
    });

    if (!ride || ride.passenger_id !== passengerId) {
      return res.status(404).json({ error: 'Corrida não encontrada' });
    }
    if (ride.status !== 'pending_adjustment') {
      return res.status(400).json({ error: 'Corrida não está aguardando resposta de ajuste' });
    }

    const offer = ride.offers[0];
    if (!offer) {
      return res.status(400).json({ error: 'Oferta de ajuste não encontrada' });
    }

    if (accept) {
      await prisma.$transaction(async (tx) => {
        await tx.ride_offers.update({
          where: { id: offer.id },
          data: { adjustment_status: 'accepted' }
        });
        await tx.rides_v2.update({
          where: { id: ride_id },
          data: { status: 'accepted', accepted_at: new Date() }
        });
      });

      console.log(`[ADJUSTMENT_ACCEPTED] ride_id=${ride_id} driver_id=${ride.driver_id} adjustment=${offer.driver_adjustment}`);

      realTimeService.emitToRide(ride_id, {
        type: 'ride.status.changed',
        status: 'accepted',
        timestamp: new Date().toISOString()
      });

      // Pricing refine + WhatsApp (fire-and-forget)
      if (ride.driver_id) {
        import('../services/pricing-engine').then(async (pe) => {
          try {
            const d = await prisma.drivers.findUnique({ where: { id: ride.driver_id! }, select: { neighborhood_id: true, neighborhoods: { select: { name: true } } } });
            await pe.refine(ride_id, d?.neighborhood_id || null, (d as any)?.neighborhoods?.name || null);
          } catch {}
        });

        prisma.drivers.findUnique({ where: { id: ride.driver_id }, select: { name: true, vehicle_color: true, vehicle_model: true, vehicle_plate: true } }).then(driver => {
          prisma.passengers.findUnique({ where: { id: passengerId }, select: { phone: true, name: true } }).then(passenger => {
            if (passenger?.phone) {
              const { whatsappEvents } = require('../modules/whatsapp');
              whatsappEvents.rideDriverAssigned(passenger.phone, {
                '1': passenger.name || 'Passageiro',
                '2': driver?.name || 'Motorista',
                '3': driver?.vehicle_model || 'Não informado',
                '4': driver?.vehicle_color || 'Não informada',
                '5': driver?.vehicle_plate || 'Não informada',
              }).catch(() => {});
            }
          });
        }).catch(() => {});
      }

      res.json({ success: true, status: 'accepted' });
    } else {
      // Passenger rejected adjustment — release driver, redispatch
      await prisma.$transaction(async (tx) => {
        await tx.ride_offers.update({
          where: { id: offer.id },
          data: { adjustment_status: 'rejected' }
        });
        await tx.rides_v2.update({
          where: { id: ride_id },
          data: {
            status: 'requested',
            driver_id: null,
            driver_adjustment: null,
            adjusted_price: null,
            accepted_at: null,
          }
        });
        if (ride.driver_id) {
          await tx.driver_status.update({
            where: { driver_id: ride.driver_id },
            data: { availability: 'online' }
          });
        }
      });

      console.log(`[ADJUSTMENT_REJECTED] ride_id=${ride_id} driver_id=${ride.driver_id} adjustment=${offer.driver_adjustment}`);

      // Redispatch
      setImmediate(() => dispatcherService.dispatchRide(ride_id).catch(() => {}));

      res.json({ success: true, status: 'rejected' });
    }
  } catch (error: any) {
    console.error('[ADJUSTMENT_RESPONSE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// GET /history — ride history for passenger or driver (MUST be before /:ride_id)
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userType = String(user.userType || user.user_type || user.role || '').toUpperCase();
    const userId = user.userId || user.id;
    if (!userId) return res.status(401).json({ error: 'Sessão inválida' });

    const where = userType === 'DRIVER'
      ? { driver_id: userId, status: { in: ['completed', 'canceled_by_passenger', 'canceled_by_driver'] as any } }
      : { passenger_id: userId, status: { in: ['completed', 'canceled_by_passenger', 'canceled_by_driver', 'no_driver'] as any } };

    const rides = await prisma.rides_v2.findMany({
      where,
      orderBy: { requested_at: 'desc' },
      take: 30,
      select: {
        id: true, status: true, origin_text: true, destination_text: true,
        requested_at: true, completed_at: true, ride_type: true,
        driver: { select: { name: true, vehicle_model: true, vehicle_plate: true } },
        passenger: { select: { name: true } },
      },
    });
    res.json({ rides });
  } catch {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
});

// Passageiro consulta corrida por ID
router.get('/:ride_id', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.ride_id },
      include: { driver: { select: { id: true, name: true, phone: true, vehicle_model: true, vehicle_plate: true, vehicle_color: true, last_lat: true, last_lng: true } } }
    });
    if (!ride || ride.passenger_id !== passengerId) {
      return res.status(404).json({ error: 'Corrida não encontrada' });
    }
    res.json({ success: true, data: {
      ...ride,
      origin_lat: Number(ride.origin_lat),
      origin_lng: Number(ride.origin_lng),
      dest_lat: Number(ride.dest_lat),
      dest_lng: Number(ride.dest_lng),
      driver: ride.driver ? {
        ...ride.driver,
        last_lat: ride.driver.last_lat ? Number(ride.driver.last_lat) : null,
        last_lng: ride.driver.last_lng ? Number(ride.driver.last_lng) : null,
      } : null,
    } });
  } catch (error: any) {
    console.error('[RIDE_GET_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.2 Passageiro cancela corrida
router.post('/:ride_id/cancel', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride) {
      return res.status(404).json({ error: 'Corrida não encontrada' });
    }

    if (ride.passenger_id !== passengerId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!['requested', 'offered', 'accepted', 'arrived'].includes(ride.status)) {
      return res.status(400).json({ error: 'Não é possível cancelar neste momento' });
    }

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'canceled_by_passenger',
        canceled_at: new Date()
      }
    });

    // Cancelar ofertas pendentes
    await prisma.ride_offers.updateMany({
      where: {
        ride_id,
        status: 'pending'
      },
      data: { status: 'canceled' }
    });

    // Se tinha motorista, liberar
    if (ride.driver_id) {
      await prisma.driver_status.update({
        where: { driver_id: ride.driver_id },
        data: { availability: 'online' }
      });
    }

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=canceled_by_passenger`);

    // WhatsApp: notificar motorista do cancelamento (se tinha motorista atribuído)
    if (ride.driver_id) {
      try {
        const driver = await prisma.drivers.findUnique({ where: { id: ride.driver_id }, select: { phone: true, name: true } });
        if (driver?.phone) {
          whatsappEvents.ridePassengerCancelled(driver.phone, {
            driver_name: driver.name || 'Motorista',
            pickup: ride.origin_text || 'Origem não informada',
            reason: 'Cancelada pelo passageiro',
          }).catch((e: any) => console.error('[WA_FAIL] ridePassengerCancelled', e.message));
        }
      } catch (e: any) { console.error('[WA_LOOKUP_FAIL] cancel', e.message); }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_CANCEL_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.6 Driver cancela corrida
router.post('/:ride_id/driver-cancel', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;
    const { reason } = req.body;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride || ride.driver_id !== driverId) return res.status(403).json({ error: 'Acesso negado' });
    if (!['accepted', 'arrived'].includes(ride.status)) return res.status(400).json({ error: 'Não é possível cancelar neste momento' });

    await prisma.$transaction(async (tx) => {
      await tx.rides_v2.update({ where: { id: ride_id }, data: { status: 'canceled_by_driver', canceled_at: new Date() } });
      await tx.driver_status.update({ where: { driver_id: driverId }, data: { availability: 'online' } });
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=canceled_by_driver driver_id=${driverId} reason=${reason || 'none'}`);
    realTimeService.emitToRide(ride_id, { type: 'ride.status.changed', status: 'canceled_by_driver', timestamp: new Date().toISOString() });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_DRIVER_CANCEL_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.7 Driver arrived
router.post('/:ride_id/arrived', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (ride.status !== 'accepted') {
      return res.status(400).json({ error: 'Operação não permitida no estado atual da corrida' });
    }

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'arrived',
        arrived_at: new Date()
      }
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=arrived driver_id=${driverId}`);

    // SSE: notificar passageiro imediatamente
    realTimeService.emitToRide(ride_id, {
      type: 'ride.status.changed',
      status: 'arrived',
      timestamp: new Date().toISOString()
    });

    // WhatsApp: notificar passageiro que motorista chegou
    try {
      const [passenger, driver] = await Promise.all([
        prisma.passengers.findUnique({ where: { id: ride.passenger_id }, select: { phone: true, name: true } }),
        prisma.drivers.findUnique({ where: { id: driverId }, select: { name: true, vehicle_model: true, vehicle_plate: true } }),
      ]);
      if (passenger?.phone) {
        whatsappEvents.rideDriverArrived(passenger.phone, {
          passenger_name: passenger.name || 'Passageiro',
          driver_name: driver?.name || 'Motorista',
          car_model: driver?.vehicle_model || '',
          plate: driver?.vehicle_plate || '',
        }).catch((e: any) => console.error('[WA_FAIL] rideDriverArrived', e.message));
      }
    } catch (e: any) { console.error('[WA_LOOKUP_FAIL] arrived', e.message); }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_ARRIVED_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.7 Driver start
router.post('/:ride_id/start', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (ride.status !== 'arrived') {
      return res.status(400).json({ error: 'Operação não permitida no estado atual da corrida' });
    }

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'in_progress',
        started_at: new Date()
      }
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=in_progress driver_id=${driverId}`);

    // SSE: notificar passageiro imediatamente
    realTimeService.emitToRide(ride_id, {
      type: 'ride.status.changed',
      status: 'in_progress',
      timestamp: new Date().toISOString()
    });

    // WhatsApp: notificar passageiro que corrida iniciou
    try {
      const passenger = await prisma.passengers.findUnique({ where: { id: ride.passenger_id }, select: { phone: true, name: true } });
      if (passenger?.phone) {
        whatsappEvents.rideStarted(passenger.phone, {
          passenger_name: passenger.name || 'Passageiro',
        }).catch((e: any) => console.error('[WA_FAIL] rideStarted', e.message));
      }
    } catch (e: any) { console.error('[WA_LOOKUP_FAIL] start', e.message); }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_START_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.7 Driver complete
router.post('/:ride_id/complete', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({ error: 'Operação não permitida no estado atual da corrida' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rides_v2.update({
        where: { id: ride_id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date()
        }
      });

      // Liberar motorista
      await tx.driver_status.update({
        where: { driver_id: driverId },
        data: { availability: 'online' }
      });
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=completed driver_id=${driverId}`);

    // SSE: notificar passageiro imediatamente
    realTimeService.emitToRide(ride_id, {
      type: 'ride.status.changed',
      status: 'completed',
      timestamp: new Date().toISOString()
    });

    // Pricing: settle (fechar economia — idempotente)
    let settlement: any = null;
    try {
      settlement = await pricingEngine.settle(ride_id);
    } catch (settleErr) {
      console.error(`[PRICING_SETTLE_FAILED] ride_id=${ride_id}`, settleErr);
    }

    // Credit consumption ANTES do WhatsApp (precisamos do saldo atualizado para a mensagem)
    let creditResult: { cost: number; matchType: string; balance: number } | null = null;
    if (process.env.CREDIT_CONSUME_ENABLED === 'true' && settlement) {
      try {
        const delta = await applyCreditDelta(
          driverId, -settlement.credit_cost,
          `ride:${settlement.credit_match_type}:${ride_id}`,
          'system',
          `ride_${ride_id}`
        );
        creditResult = { cost: settlement.credit_cost, matchType: settlement.credit_match_type, balance: delta.balance };
        console.log(`[CREDIT_CONSUMED] ride_id=${ride_id} driver_id=${driverId} cost=${settlement.credit_cost} type=${settlement.credit_match_type} balance=${delta.balance} alreadyProcessed=${delta.alreadyProcessed}`);
      } catch (creditErr) {
        console.error(`[CREDIT_CONSUME_FAILED] ride_id=${ride_id} driver_id=${driverId}`, creditErr);
      }
    }

    // WhatsApp: notificar passageiro e motorista que corrida concluiu
    if (process.env.WA_RIDE_COMPLETE_ENABLED === 'true' && settlement) {
      try {
        const [passenger, driver] = await Promise.all([
          prisma.passengers.findUnique({ where: { id: ride.passenger_id }, select: { phone: true, name: true } }),
          prisma.drivers.findUnique({ where: { id: driverId }, select: { phone: true, name: true } }),
        ]);
        const pickup = ride.origin_text || 'Origem não informada';
        const dropoff = ride.destination_text || 'Destino não informado';
        const price = String(settlement.final_price);
        if (passenger?.phone) {
          // Template: {{1}}=passenger_name {{2}}=driver_name {{3}}=pickup {{4}}=dropoff {{5}}=price
          whatsappEvents.ridePassengerCompleted(passenger.phone, {
            '1': passenger.name || 'Passageiro',
            '2': driver?.name || 'Motorista',
            '3': pickup,
            '4': dropoff,
            '5': price,
          }).catch((e: any) => console.error('[WA_FAIL] ridePassengerCompleted', e.message));
        }
        if (driver?.phone) {
          // Template v2: {{1}}=name {{2}}=pickup {{3}}=dropoff {{4}}=price {{5}}=credits_consumed {{6}}=credit_balance
          whatsappEvents.rideDriverCompleted(driver.phone, {
            '1': driver.name || 'Motorista',
            '2': pickup,
            '3': dropoff,
            '4': price,
            '5': String(creditResult?.cost ?? settlement.credit_cost),
            '6': String(creditResult?.balance ?? 0),
          }).catch((e: any) => console.error('[WA_FAIL] rideDriverCompleted', e.message));
        }
      } catch (e: any) { console.error('[WA_LOOKUP_FAIL] complete', e.message); }
    }

    res.json({ success: true, credit: creditResult });
  } catch (error: any) {
    console.error('[RIDE_COMPLETE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// Driver location update during ride
router.post('/:ride_id/location', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Localização obrigatória' });
    }

    // Verify ride belongs to driver and is active
    const ride = await prisma.rides_v2.findFirst({
      where: { id: ride_id, driver_id: driverId, status: { in: ['accepted', 'arrived', 'in_progress'] } }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Corrida ativa não encontrada' });
    }

    // Update driver location
    await prisma.drivers.update({
      where: { id: driverId },
      data: { last_lat: lat, last_lng: lng, last_location_updated_at: new Date() }
    });

    // Emit to passenger via SSE
    realTimeService.emitToRide(ride_id, {
      type: 'driver_location',
      lat, lng,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_LOCATION_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

export default router;
