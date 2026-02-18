import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { dispatcherService } from '../services/dispatcher.service';
import { acceptOfferInternal } from '../services/offer-acceptance.service';
import { Decimal } from '@prisma/client/runtime/library';
import jwt from 'jsonwebtoken';

const router = Router();

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

// 5.3 Driver online/offline
router.post('/me/availability', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { availability } = req.body;

    if (!['offline', 'online', 'busy'].includes(availability)) {
      return res.status(400).json({ error: 'Invalid availability' });
    }

    await prisma.driver_status.upsert({
      where: { driver_id: driverId },
      create: {
        driver_id: driverId,
        availability
      },
      update: {
        availability
      }
    });

    console.log(`[DRIVER_AVAILABILITY] driver_id=${driverId} availability=${availability}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[DRIVER_AVAILABILITY_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.4 Driver envia localização
router.post('/me/location', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { lat, lng, heading, speed } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    await prisma.driver_locations.upsert({
      where: { driver_id: driverId },
      create: {
        driver_id: driverId,
        lat: new Decimal(lat),
        lng: new Decimal(lng),
        heading: heading ? new Decimal(heading) : null,
        speed: speed ? new Decimal(speed) : null
      },
      update: {
        lat: new Decimal(lat),
        lng: new Decimal(lng),
        heading: heading ? new Decimal(heading) : null,
        speed: speed ? new Decimal(speed) : null
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[DRIVER_LOCATION_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.5 Driver aceita oferta
router.post('/offers/:offer_id/accept', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { offer_id } = req.params;

    const result = await acceptOfferInternal(offer_id, driverId);

    res.json({ success: true, data: { ride_id: result.id } });
  } catch (error: any) {
    console.error('[OFFER_ACCEPT_ERROR]', error);
    
    if (error.message === 'Offer not found') {
      return res.status(404).json({ error: 'Offer not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (error.message === 'Offer not pending' || error.message === 'Offer expired') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.6 Driver rejeita oferta
router.post('/offers/:offer_id/reject', requireDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { offer_id } = req.params;

    const offer = await prisma.ride_offers.findUnique({
      where: { id: offer_id }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.driver_id !== driverId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer not pending' });
    }

    await prisma.ride_offers.update({
      where: { id: offer_id },
      data: {
        status: 'rejected',
        responded_at: new Date()
      }
    });

    console.log(`[OFFER_REJECTED] offer_id=${offer_id} ride_id=${offer.ride_id} driver_id=${driverId}`);

    // Redispatch (async)
    setImmediate(async () => {
      await prisma.rides_v2.update({
        where: { id: offer.ride_id },
        data: { status: 'requested' }
      });
      await dispatcherService.dispatchRide(offer.ride_id);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[OFFER_REJECT_ERROR]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
