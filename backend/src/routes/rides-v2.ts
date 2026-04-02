import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { dispatcherService } from '../services/dispatcher.service';
import { GeoResolveService } from '../services/geo-resolve';
import { Decimal } from '@prisma/client/runtime/library';
import { realTimeService } from '../services/realtime.service';
import jwt from 'jsonwebtoken';

const router = Router();
const geoResolveService = new GeoResolveService();

// Middleware de autenticação JWT (compatível com token real do sistema)
const requirePassenger = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // payload novo (userType/userId) + legado (role/id)
    const userType = String(decoded.userType || decoded.user_type || decoded.role || '').toUpperCase();
    const userId = decoded.userId || decoded.id;

    if (userType !== 'PASSENGER' || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).passengerId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireDriver = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    const userType = String(decoded.userType || decoded.user_type || decoded.role || '').toUpperCase();
    const userId = decoded.userId || decoded.id;

    if (userType !== 'DRIVER' || !userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    (req as any).driverId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 5.1 Passageiro solicita corrida
router.post('/', requirePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { origin, destination, type = 'normal' } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    // Validação
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return res.status(400).json({ error: 'Invalid origin or destination' });
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
    const ride = await prisma.rides_v2.create({
      data: {
        passenger_id: passengerId,
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

    // Resolver território da origem via geofence (não bloqueia criação)
    try {
      const geoResult = await geoResolveService.resolveCoordinates(origin.lat, origin.lng);
      if (geoResult.match && geoResult.resolvedArea) {
        await prisma.rides_v2.update({
          where: { id: ride.id },
          data: { origin_neighborhood_id: geoResult.resolvedArea.id }
        });
        console.log(`[RIDE_GEO_RESOLVED] ride_id=${ride.id} origin_neighborhood_id=${geoResult.resolvedArea.id} name=${geoResult.resolvedArea.name}`);
      }
    } catch (geoErr) {
      console.error(`[RIDE_GEO_RESOLVE_FAILED] ride_id=${ride.id}`, geoErr);
    }

    // Acionar dispatcher (async, não bloqueia resposta)
    setImmediate(() => dispatcherService.dispatchRide(ride.id));

    res.json({ success: true, data: { ride_id: ride.id, status: ride.status } });
  } catch (error: any) {
    console.error('[RIDE_CREATE_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Passageiro consulta corrida por ID
router.get('/:ride_id', requirePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.ride_id },
      include: { driver: { select: { id: true, name: true, phone: true, vehicle_model: true, vehicle_plate: true, vehicle_color: true, last_lat: true, last_lng: true } } }
    });
    if (!ride || ride.passenger_id !== passengerId) {
      return res.status(404).json({ error: 'Ride not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.2 Passageiro cancela corrida
router.post('/:ride_id/cancel', requirePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.passenger_id !== passengerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!['requested', 'offered', 'accepted', 'arrived'].includes(ride.status)) {
      return res.status(400).json({ error: 'Cannot cancel ride in current status' });
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

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_CANCEL_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.7 Driver arrived
router.post('/:ride_id/arrived', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (ride.status !== 'accepted') {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'arrived',
        arrived_at: new Date()
      }
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=arrived driver_id=${driverId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_ARRIVED_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.7 Driver start
router.post('/:ride_id/start', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (ride.status !== 'arrived') {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'in_progress',
        started_at: new Date()
      }
    });

    console.log(`[RIDE_STATUS_CHANGED] ride_id=${ride_id} status=in_progress driver_id=${driverId}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_START_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.7 Driver complete
router.post('/:ride_id/complete', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;

    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    
    if (!ride || ride.driver_id !== driverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rides_v2.update({
        where: { id: ride_id },
        data: {
          status: 'completed',
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

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RIDE_COMPLETE_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Driver location update during ride
router.post('/:ride_id/location', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { ride_id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    // Verify ride belongs to driver and is active
    const ride = await prisma.rides_v2.findFirst({
      where: { id: ride_id, driver_id: driverId, status: { in: ['accepted', 'arrived', 'in_progress'] } }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Active ride not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
