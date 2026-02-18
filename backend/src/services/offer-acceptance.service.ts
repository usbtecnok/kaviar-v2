import { prisma } from '../lib/prisma';

export async function acceptOfferInternal(offerId: string, driverId: string) {
  return await prisma.$transaction(async (tx) => {
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
}
