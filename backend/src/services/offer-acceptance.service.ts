import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { realTimeService } from './realtime.service';
import * as pricingEngine from './pricing-engine';

const ADJUSTMENT_MIN_PASSENGER_VERSION = '1.4.0';

function isVersionCompatible(version: string | null): boolean {
  if (!version) return false;
  const parts = version.split('.').map(Number);
  const min = ADJUSTMENT_MIN_PASSENGER_VERSION.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((parts[i] || 0) > (min[i] || 0)) return true;
    if ((parts[i] || 0) < (min[i] || 0)) return false;
  }
  return true; // equal
}

export async function acceptOfferInternal(offerId: string, driverId: string, adjustment?: number) {
  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.ride_offers.findUnique({
      where: { id: offerId },
      include: { ride: true }
    });

    if (!offer) throw new Error('Offer not found');
    if (offer.driver_id !== driverId) throw new Error('Forbidden');
    if (offer.status !== 'pending') throw new Error('Offer not pending');
    if (offer.expires_at < new Date()) throw new Error('Offer expired');

    // Determine adjustment flow
    let adjustmentStatus: string | null = null;
    let rideStatus: 'accepted' | 'pending_adjustment' = 'accepted';

    if (adjustment) {
      const compatible = isVersionCompatible(offer.ride.passenger_app_version);
      if (compatible) {
        adjustmentStatus = 'pending';
        rideStatus = 'pending_adjustment';
      } else {
        adjustmentStatus = 'skipped';
        console.log(`[ADJUSTMENT_SKIPPED] offer_id=${offerId} ride_id=${offer.ride_id} reason=passenger_incompatible version=${offer.ride.passenger_app_version}`);
      }
    }

    await tx.ride_offers.update({
      where: { id: offerId },
      data: {
        status: 'accepted',
        responded_at: new Date(),
        driver_adjustment: adjustment ? new Decimal(adjustment) : null,
        adjustment_status: adjustmentStatus,
      }
    });

    await tx.ride_offers.updateMany({
      where: { ride_id: offer.ride_id, id: { not: offerId }, status: 'pending' },
      data: { status: 'canceled' }
    });

    await tx.rides_v2.update({
      where: { id: offer.ride_id },
      data: {
        driver_id: driverId,
        status: rideStatus,
        accepted_at: rideStatus === 'accepted' ? new Date() : undefined,
        driver_adjustment: adjustmentStatus === 'pending' ? new Decimal(adjustment!) : null,
        adjusted_price: adjustmentStatus === 'pending' && offer.ride.quoted_price
          ? new Decimal(Number(offer.ride.quoted_price) + adjustment!)
          : null,
      }
    });

    await tx.driver_status.upsert({
      where: { driver_id: driverId },
      create: { driver_id: driverId, availability: 'busy' },
      update: { availability: 'busy' }
    });

    const logAdj = adjustment ? ` adjustment=${adjustment} adjustment_status=${adjustmentStatus}` : '';
    console.log(`[OFFER_ACCEPTED] offer_id=${offerId} ride_id=${offer.ride_id} driver_id=${driverId}${logAdj}`);
    console.log(`[RIDE_STATUS_CHANGED] ride_id=${offer.ride_id} status=${rideStatus} driver_id=${driverId}`);

    return { ride: offer.ride, adjustmentStatus, rideStatus };
  });

  const { ride, adjustmentStatus, rideStatus } = result;

  // SSE: notify passenger
  if (rideStatus === 'pending_adjustment') {
    realTimeService.emitToRide(ride.id, {
      type: 'ride.adjustment.pending',
      status: 'pending_adjustment',
      driver_id: driverId,
      quoted_price: Number(ride.quoted_price),
      driver_adjustment: adjustment,
      adjusted_price: Number(ride.quoted_price || 0) + (adjustment || 0),
      timestamp: new Date().toISOString()
    });
  } else {
    realTimeService.emitToRide(ride.id, {
      type: 'ride.status.changed',
      status: 'accepted',
      driver_id: driverId,
      timestamp: new Date().toISOString()
    });
  }

  // Pricing refine (fire-and-forget, only on direct accept)
  if (rideStatus === 'accepted') {
    try {
      const driverData = await prisma.drivers.findUnique({
        where: { id: driverId },
        select: { neighborhood_id: true, neighborhoods: { select: { name: true } } }
      });
      await pricingEngine.refine(
        ride.id,
        driverData?.neighborhood_id || null,
        (driverData as any)?.neighborhoods?.name || null
      );
    } catch (e: any) {
      console.error('[PRICING_REFINE_FAIL] acceptOffer', e.message);
    }
  }

  // WhatsApp: only on direct accept (not pending_adjustment)
  if (rideStatus === 'accepted') {
    try {
      const [passenger, driver] = await Promise.all([
        prisma.passengers.findUnique({ where: { id: ride.passenger_id }, select: { phone: true, name: true } }),
        prisma.drivers.findUnique({ where: { id: driverId }, select: { name: true, vehicle_color: true, vehicle_model: true, vehicle_plate: true } }),
      ]);
      if (passenger?.phone) {
        const { whatsappEvents } = require('../modules/whatsapp');
        whatsappEvents.rideDriverAssigned(passenger.phone, {
          '1': passenger.name || 'Passageiro',
          '2': driver?.name || 'Motorista',
          '3': driver?.vehicle_model || 'Não informado',
          '4': driver?.vehicle_color || 'Não informada',
          '5': driver?.vehicle_plate || 'Não informada',
        }).catch((e: any) => console.error('[WA_FAIL] rideDriverAssigned', e.message));
      }
    } catch (e: any) {
      console.error('[WA_LOOKUP_FAIL] acceptOffer', e.message);
    }
  }

  return { id: ride.id, adjustment_status: adjustmentStatus };
}
