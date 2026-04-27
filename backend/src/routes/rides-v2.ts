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
import { getPresignedUrl } from '../config/s3-upload';
import { config } from '../config';

const toPhotoUrl = async (key: string | null | undefined): Promise<string | null> => {
  if (!key) return null;
  const k = key.startsWith('http')
    ? key.split('.amazonaws.com/')[1]?.split('?')[0] ?? null
    : key;
  if (!k) return null;
  try { return await getPresignedUrl(k); } catch { return null; }
};
import { triggerEmergency, appendTrailPoint } from '../services/ride-emergency.service';

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

// 5.0.1 Corrida ativa do passageiro (para recuperação de estado)
router.get('/active', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const ride = await prisma.rides_v2.findFirst({
      where: {
        passenger_id: passengerId,
        status: { in: ['scheduled', 'requested', 'offered', 'pending_adjustment', 'accepted', 'arrived', 'in_progress'] }
      },
      orderBy: { updated_at: 'desc' },
      include: { driver: { select: { name: true, phone: true, vehicle_model: true, vehicle_plate: true, vehicle_color: true, id: true, last_lat: true, last_lng: true, photo_url: true } } }
    });
    res.json({ success: true, data: ride ? {
      ...ride,
      origin_lat: Number(ride.origin_lat),
      origin_lng: Number(ride.origin_lng),
      dest_lat: Number(ride.dest_lat),
      dest_lng: Number(ride.dest_lng),
      driver: ride.driver ? { ...ride.driver, photo_url: await toPhotoUrl(ride.driver.photo_url) } : null,
    } : null });
  } catch (error: any) {
    console.error('[PASSENGER_ACTIVE_RIDE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.1 Passageiro solicita corrida
router.post('/', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { origin, destination, type = 'normal', trip_details, scheduled_for, wait_requested = false, wait_estimated_min, post_wait_destination } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // Validação
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'Origem ou destino inválido' });
    }

    // Validar agendamento
    let scheduledDate: Date | null = null;
    if (scheduled_for) {
      scheduledDate = new Date(scheduled_for);
      const diffMs = scheduledDate.getTime() - Date.now();
      if (diffMs < 15 * 60_000) return res.status(400).json({ error: 'Horário deve ser pelo menos 15 minutos no futuro' });
      if (diffMs > 24 * 60 * 60_000) return res.status(400).json({ error: 'Horário deve ser no máximo 24 horas no futuro' });

      const existing = await prisma.rides_v2.findFirst({
        where: { passenger_id: passengerId, status: 'scheduled' }
      });
      if (existing) return res.status(400).json({ error: 'Você já tem uma corrida agendada. Cancele antes de agendar outra.' });
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
        trip_details: {
          ...(trip_details || {}),
          ...(config.wait.enabled && wait_requested && post_wait_destination?.lat && post_wait_destination?.lng
            ? { post_wait_destination: { lat: Number(post_wait_destination.lat), lng: Number(post_wait_destination.lng), text: post_wait_destination.text || null } }
            : {}),
        },
        scheduled_for: scheduledDate,
        status: scheduledDate ? 'scheduled' : 'requested',
        wait_requested: config.wait.enabled ? Boolean(wait_requested) : false,
        wait_estimated_min: config.wait.enabled && wait_requested && wait_estimated_min ? Number(wait_estimated_min) : null,
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
        originNeighborhoodId, destNeighborhoodId,
        config.wait.enabled && wait_requested && post_wait_destination?.lat && post_wait_destination?.lng
          ? { lat: Number(post_wait_destination.lat), lng: Number(post_wait_destination.lng) }
          : null
      );
    } catch (priceErr) {
      console.error(`[PRICING_QUOTE_FAILED] ride_id=${ride.id}`, priceErr);
    }

    // Acionar dispatcher (async, não bloqueia resposta) — skip for scheduled rides
    if (!scheduledDate) {
      setImmediate(() => dispatcherService.dispatchRide(ride.id).catch(err => {
        console.error(`[DISPATCH_FIRE_FORGET_ERROR] ride_id=${ride.id}`, err);
        prisma.rides_v2.update({ where: { id: ride.id }, data: { status: 'no_driver' } }).catch(e => console.error(`[DISPATCH_FALLBACK_FAILED] ride_id=${ride.id}`, e));
      }));
    } else {
      console.log(`[RIDE_SCHEDULED] ride_id=${ride.id} scheduled_for=${scheduledDate.toISOString()}`);
    }

    res.json({
      success: true,
      data: {
        ride_id: ride.id,
        status: scheduledDate ? 'scheduled' : ride.status,
        scheduled_for: scheduledDate?.toISOString() ?? null,
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
          } catch (e) { console.warn(`[PRICING_REFINE_FAILED] ride_id=${ride_id}`, e); }
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
              }).catch((e: any) => console.warn(`[WA_DRIVER_ASSIGNED_FAILED] ride_id=${ride_id}`, e?.message));
            }
          });
        }).catch((e) => console.warn(`[ADJUSTMENT_WA_LOOKUP_FAILED] ride_id=${ride_id}`, e?.message));
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
      setImmediate(() => dispatcherService.dispatchRide(ride_id).catch(e => console.error(`[REDISPATCH_FAILED] ride_id=${ride_id}`, e)));

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
      include: { driver: { select: { id: true, name: true, phone: true, vehicle_model: true, vehicle_plate: true, vehicle_color: true, last_lat: true, last_lng: true, photo_url: true } } }
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
        photo_url: await toPhotoUrl(ride.driver.photo_url),
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

    if (!['scheduled', 'requested', 'offered', 'accepted', 'arrived'].includes(ride.status)) {
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

// 5.6 Driver cancela corrida (com redispatch automático V1)
router.post('/:ride_id/driver-cancel', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;
    const { reason } = req.body;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride || ride.driver_id !== driverId) return res.status(403).json({ error: 'Acesso negado' });
    if (!['accepted', 'arrived'].includes(ride.status)) return res.status(400).json({ error: 'Não é possível cancelar neste momento' });

    const td = (ride.trip_details as any) || {};
    const redispatchCount = td._redispatch_count || 0;
    const canRedispatch = redispatchCount < 1;

    if (canRedispatch) {
      // Redispatch: limpar ride e reabrir
      await prisma.$transaction(async (tx) => {
        await tx.rides_v2.update({
          where: { id: ride_id },
          data: {
            status: 'requested',
            driver_id: null,
            accepted_at: null,
            arrived_at: null,
            driver_adjustment: null,
            adjusted_price: null,
            trip_details: { ...td, _redispatch_count: redispatchCount + 1 },
          }
        });
        await tx.ride_offers.updateMany({
          where: { ride_id, driver_id: driverId, status: 'accepted' },
          data: { status: 'canceled' }
        });
        await tx.driver_status.update({ where: { driver_id: driverId }, data: { availability: 'online' } });
      });

      console.log(`[RIDE_REDISPATCH] ride_id=${ride_id} canceled_by=${driverId} reason=${reason || 'none'} attempt=${redispatchCount + 1}`);
      realTimeService.emitToRide(ride_id, { type: 'ride.redispatching', timestamp: new Date().toISOString() });

      setImmediate(() => dispatcherService.dispatchRide(ride_id).catch(err => {
        console.error(`[REDISPATCH_ERROR] ride_id=${ride_id}`, err);
        prisma.rides_v2.update({ where: { id: ride_id }, data: { status: 'canceled_by_driver', canceled_at: new Date() } }).catch(() => {});
      }));
    } else {
      // Limite de redispatch atingido — cancelar normalmente
      await prisma.$transaction(async (tx) => {
        await tx.rides_v2.update({ where: { id: ride_id }, data: { status: 'canceled_by_driver', canceled_at: new Date() } });
        await tx.driver_status.update({ where: { driver_id: driverId }, data: { availability: 'online' } });
      });

      console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=canceled_by_driver driver_id=${driverId} reason=${reason || 'none'} redispatch_exhausted=true`);
      realTimeService.emitToRide(ride_id, { type: 'ride.status.changed', status: 'canceled_by_driver', timestamp: new Date().toISOString() });
    }

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

// 5.7 Wait start ("Levar e esperar")
router.post('/:ride_id/wait/start', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    if (!config.wait.enabled) return res.status(404).json({ error: 'Funcionalidade não disponível' });

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride || ride.driver_id !== driverId) return res.status(403).json({ error: 'Acesso negado' });
    if (!ride.wait_requested) return res.status(400).json({ error: 'Espera não solicitada nesta corrida' });
    if (ride.status !== 'in_progress') return res.status(400).json({ error: 'Operação não permitida no estado atual da corrida' });
    if (ride.wait_started_at) return res.status(400).json({ error: 'Espera já iniciada' });

    await prisma.rides_v2.update({ where: { id: ride_id }, data: { wait_started_at: new Date() } });
    console.log(`[WAIT_START] ride_id=${ride_id} driver_id=${driverId}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[WAIT_START_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.7 Wait end ("Levar e esperar")
router.post('/:ride_id/wait/end', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    if (!config.wait.enabled) return res.status(404).json({ error: 'Funcionalidade não disponível' });

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride || ride.driver_id !== driverId) return res.status(403).json({ error: 'Acesso negado' });
    if (!ride.wait_started_at) return res.status(400).json({ error: 'Espera não foi iniciada' });
    if (ride.wait_ended_at) return res.status(400).json({ error: 'Espera já encerrada' });

    await prisma.rides_v2.update({ where: { id: ride_id }, data: { wait_ended_at: new Date() } });
    console.log(`[WAIT_END] ride_id=${ride_id} driver_id=${driverId}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[WAIT_END_ERROR]', error);
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

    // Wait charge: somar ao final_price após settle (apenas se espera foi encerrada)
    if (settlement && ride.wait_requested && ride.wait_started_at && ride.wait_ended_at) {
      try {
        const waitMinutes = Math.floor(
          (ride.wait_ended_at.getTime() - ride.wait_started_at.getTime()) / 60000
        );
        const waitCharge = Math.round(waitMinutes * config.wait.ratePerMin * 100) / 100;
        if (waitCharge > 0) {
          const newFinalPrice = Math.round((settlement.final_price + waitCharge) * 100) / 100;
          await prisma.$transaction([
            prisma.rides_v2.update({
              where: { id: ride_id },
              data: { final_price: new Decimal(newFinalPrice) }
            }),
            prisma.$executeRaw`
              UPDATE ride_settlements
              SET final_price = ${newFinalPrice}
              WHERE ride_id = ${ride_id}
            `,
          ]);
          settlement.final_price = newFinalPrice;
          // Crédito dobrado: espera real = serviço composto
          const doubledCreditCost = Math.round(settlement.credit_cost * 2 * 100) / 100;
          await prisma.$executeRaw`
            UPDATE ride_settlements
            SET credit_cost = ${doubledCreditCost}
            WHERE ride_id = ${ride_id}
          `;
          settlement.credit_cost = doubledCreditCost;
          console.log(`[WAIT_CHARGE] ride_id=${ride_id} wait_min=${waitMinutes} charge=${waitCharge} new_final=${newFinalPrice} credit_cost=${doubledCreditCost}`);
        }
      } catch (waitErr) {
        console.error(`[WAIT_CHARGE_FAILED] ride_id=${ride_id}`, waitErr);
      }
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
          // Use v3/v4 if approved, fallback to v2
          const hasWait = !!(ride.wait_requested && ride.wait_started_at && ride.wait_ended_at);
          const waitMinutes = hasWait
            ? Math.floor((ride.wait_ended_at!.getTime() - ride.wait_started_at!.getTime()) / 60000)
            : 0;
          const waitCharge = Math.round(waitMinutes * 0.50 * 100) / 100;
          const basePrice = hasWait && waitCharge > 0
            ? String(Math.round((settlement.final_price - waitCharge) * 100) / 100)
            : price;

          const useV4 = hasWait && waitCharge > 0 && !!process.env.WA_TPL_DRIVER_COMPLETED_V4_WAIT;
          const useV3 = !useV4 && !!process.env.WA_TPL_DRIVER_COMPLETED_V3;

          if (useV4) {
            whatsappEvents.rideDriverCompletedV4Wait(driver.phone, {
              '1': driver.name || 'Motorista',
              '2': pickup, '3': dropoff,
              '4': basePrice,
              '5': String(waitCharge.toFixed(2)),
              '6': price,
              '7': String(creditResult?.cost ?? settlement.credit_cost),
              '8': String(creditResult?.balance ?? 0),
            }).catch((e: any) => console.error('[WA_FAIL] rideDriverCompletedV4Wait', e.message));
          } else if (useV3) {
            whatsappEvents.rideDriverCompletedV3(driver.phone, {
              '1': driver.name || 'Motorista',
              '2': pickup, '3': dropoff,
              '4': price,
              '5': String(creditResult?.cost ?? settlement.credit_cost),
              '6': String(creditResult?.balance ?? 0),
            }).catch((e: any) => console.error('[WA_FAIL] rideDriverCompletedV3', e.message));
          } else {
            // Template v2: {{1}}=name {{2}}=pickup {{3}}=dropoff {{4}}=price {{5}}=credits_consumed {{6}}=credit_balance
            whatsappEvents.rideDriverCompleted(driver.phone, {
              '1': driver.name || 'Motorista',
              '2': pickup, '3': dropoff,
              '4': price,
              '5': String(creditResult?.cost ?? settlement.credit_cost),
              '6': String(creditResult?.balance ?? 0),
            }).catch((e: any) => console.error('[WA_FAIL] rideDriverCompleted', e.message));
          }
        }
      } catch (e: any) { console.error('[WA_LOOKUP_FAIL] complete', e.message); }
    }

    res.json({ success: true, credit: creditResult });
  } catch (error: any) {
    console.error('[RIDE_COMPLETE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// 5.9 Passenger boarding status (arrived state only)
const VALID_BOARDING = ['at_door', 'descending', '2_minutes'] as const;
router.post('/:ride_id/boarding-status', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { ride_id } = req.params;
    const { status } = req.body;

    if (!VALID_BOARDING.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride || ride.passenger_id !== passengerId) return res.status(403).json({ error: 'Acesso negado' });
    if (ride.status !== 'arrived') return res.status(400).json({ error: 'Operação não permitida no estado atual' });

    const td = (ride.trip_details as any) || {};
    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: { trip_details: { ...td, boarding_status: status } }
    });

    // Also emit via SSE for faster delivery if driver has SSE client
    realTimeService.emitToRide(ride_id, {
      type: 'ride.boarding.status',
      status,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[BOARDING_STATUS_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// Driver location update during ride
router.post('/:ride_id/location', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;
    const { lat, lng, speed, heading } = req.body;

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

    // Emergency vault: append trail point if emergency active
    appendTrailPoint(ride_id, { lat, lng, speed, heading, source: 'driver' }).catch(() => {});

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_LOCATION_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// Share ride: generate temporary public tracking link
router.post('/:ride_id/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride) return res.status(404).json({ error: 'Corrida não encontrada' });

    // Verify ownership
    if (ride.passenger_id !== user.userId && ride.driver_id !== user.userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!['accepted', 'arrived', 'in_progress'].includes(ride.status)) {
      return res.status(400).json({ error: 'Corrida não está ativa' });
    }

    // Idempotent: return existing token if valid
    if (ride.share_token && ride.share_expires_at && ride.share_expires_at > new Date()) {
      return res.json({ success: true, token: ride.share_token, url: `https://app.kaviar.com.br/track/${ride.share_token}` });
    }

    // Generate new token
    const crypto = require('crypto');
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4h

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: { share_token: token, share_expires_at: expiresAt },
    });

    res.json({ success: true, token, url: `https://app.kaviar.com.br/track/${token}` });
  } catch (error: any) {
    console.error('[RIDE_SHARE_ERROR]', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Emergency vault: trigger emergency event
router.post('/:ride_id/emergency', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { ride_id } = req.params;

    // Feature flag check
    const flag = await prisma.feature_flags.findUnique({ where: { key: 'emergency_vault' } });
    if (!flag?.enabled) {
      return res.status(404).json({ error: 'Feature não disponível' });
    }

    const triggeredByType = user.userType === 'DRIVER' ? 'driver' : 'passenger';
    const triggeredById = user.userId;

    const { event, created } = await triggerEmergency({ rideId: ride_id, triggeredByType, triggeredById });

    if (created) {
      // SSE: notify the other side
      if (triggeredByType === 'passenger') {
        const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id }, select: { driver_id: true } });
        if (ride?.driver_id) {
          realTimeService.emitToDriver(ride.driver_id, { type: 'emergency.activated', event_id: event.id });
        }
      } else {
        realTimeService.emitToRide(ride_id, { type: 'emergency.activated', event_id: event.id });
      }

      // WhatsApp: notify admin (best-effort)
      const snapshot = event.snapshot as any;
      const adminPhone = process.env.EMERGENCY_ADMIN_PHONE;
      if (adminPhone) {
        const msg = `🚨 EMERGÊNCIA KAVIAR\nCorrida: ${ride_id}\nAcionado por: ${triggeredByType}\n${snapshot.driver ? `Motorista: ${snapshot.driver.name} • ${snapshot.driver.vehicle_plate}` : ''}\nPassageiro: ${snapshot.passenger.name}`;
        whatsappEvents.driverAlert(adminPhone, { '1': msg }).catch((e: any) => console.error('[WA_FAIL] emergency', e.message));
      }
    }

    res.status(created ? 201 : 200).json({ success: true, event_id: event.id });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') return res.status(404).json({ error: 'Corrida não encontrada' });
    if (error.message === 'RIDE_NOT_ACTIVE') return res.status(400).json({ error: 'Corrida não está ativa' });
    if (error.message === 'ACCESS_DENIED') return res.status(403).json({ error: 'Acesso negado' });
    console.error('[EMERGENCY_TRIGGER_ERROR]', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
});

// POST /api/v2/rides/:ride_id/passenger-location — passageiro compartilha localização com motorista
router.post('/:ride_id/passenger-location', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const { ride_id } = req.params;
    const passengerId = (req as any).passengerId;
    const { lat, lng } = req.body;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat e lng obrigatórios' });

    const ride = await prisma.rides_v2.findFirst({
      where: { id: ride_id, passenger_id: passengerId, status: { in: ['accepted', 'arrived'] } },
      select: { id: true, driver_id: true },
    });
    if (!ride) return res.status(404).json({ error: 'Corrida não encontrada ou status inválido' });

    await prisma.passengers.update({ where: { id: passengerId }, data: { last_lat: lat, last_lng: lng, last_location_updated_at: new Date() } });
    realTimeService.emitToRide(ride_id, { type: 'passenger_location', lat, lng, timestamp: new Date().toISOString() });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
