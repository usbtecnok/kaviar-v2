import { prisma } from '../lib/prisma';

export async function acceptOfferInternal(offerId: string, driverId: string) {
  const ride = await prisma.$transaction(async (tx) => {
    const offer = await tx.ride_offers.findUnique({
      where: { id: offerId },
      include: { ride: true }
    });

    if (!offer) throw new Error('Offer not found');
    if (offer.driver_id !== driverId) throw new Error('Forbidden');
    if (offer.status !== 'pending') throw new Error('Offer not pending');
    if (offer.expires_at < new Date()) throw new Error('Offer expired');

    await tx.ride_offers.update({
      where: { id: offerId },
      data: { status: 'accepted', responded_at: new Date() }
    });

    await tx.ride_offers.updateMany({
      where: {
        ride_id: offer.ride_id,
        id: { not: offerId },
        status: 'pending'
      },
      data: { status: 'canceled' }
    });

    await tx.rides_v2.update({
      where: { id: offer.ride_id },
      data: {
        driver_id: driverId,
        status: 'accepted',
        accepted_at: new Date()
      }
    });

    await tx.driver_status.upsert({
      where: { driver_id: driverId },
      create: { driver_id: driverId, availability: 'busy' },
      update: { availability: 'busy' }
    });

    console.log(`[OFFER_ACCEPTED] offer_id=${offerId} ride_id=${offer.ride_id} driver_id=${driverId}`);
    console.log(`[RIDE_STATUS_CHANGED] ride_id=${offer.ride_id} status=accepted driver_id=${driverId}`);

    return offer.ride;
  });

  // WhatsApp: notificar passageiro que motorista foi atribuído (fire-and-forget)
  // ⚠️ SEGURADO: ativar via WA_RIDE_ASSIGNED_ENABLED=true após confirmar body do template no Twilio
  if (process.env.WA_RIDE_ASSIGNED_ENABLED === 'true') {
    try {
      const [passenger, driver] = await Promise.all([
        prisma.passengers.findUnique({ where: { id: ride.passenger_id }, select: { phone: true, name: true } }),
        prisma.drivers.findUnique({ where: { id: driverId }, select: { name: true, vehicle_model: true, vehicle_plate: true } }),
      ]);
      if (passenger?.phone) {
        const { whatsappEvents } = require('../modules/whatsapp');
        whatsappEvents.rideDriverAssigned(passenger.phone, {
          passenger_name: passenger.name || 'Passageiro',
          driver_name: driver?.name || 'Motorista',
          car_model: driver?.vehicle_model || '',
          plate: driver?.vehicle_plate || '',
          dropoff: ride.destination_text || 'Destino não informado',
        }).catch((e: any) => console.error('[WA_FAIL] rideDriverAssigned', e.message));
      }
    } catch (e: any) {
      console.error('[WA_LOOKUP_FAIL] acceptOffer', e.message);
    }
  }

  return ride;
}
