import { prisma } from '../lib/prisma';

interface TriggerParams {
  rideId: string;
  triggeredByType: 'passenger' | 'driver';
  triggeredById: string;
}

export async function triggerEmergency({ rideId, triggeredByType, triggeredById }: TriggerParams) {
  // Idempotent: return existing active event
  const existing = await prisma.ride_emergency_events.findFirst({
    where: { ride_id: rideId, status: 'active' },
  });
  if (existing) return { event: existing, created: false };

  const ride = await prisma.rides_v2.findUnique({
    where: { id: rideId },
    include: {
      driver: { select: { id: true, name: true, phone: true, vehicle_plate: true, last_lat: true, last_lng: true } },
      passenger: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!ride) throw new Error('RIDE_NOT_FOUND');
  if (!['accepted', 'arrived', 'in_progress'].includes(ride.status)) throw new Error('RIDE_NOT_ACTIVE');

  // Verify ownership
  if (triggeredByType === 'passenger' && ride.passenger_id !== triggeredById) throw new Error('ACCESS_DENIED');
  if (triggeredByType === 'driver' && ride.driver_id !== triggeredById) throw new Error('ACCESS_DENIED');

  const snapshot = {
    ride_status: ride.status,
    ride_type: ride.ride_type,
    origin_lat: Number(ride.origin_lat),
    origin_lng: Number(ride.origin_lng),
    origin_text: ride.origin_text,
    dest_lat: Number(ride.dest_lat),
    dest_lng: Number(ride.dest_lng),
    dest_text: ride.destination_text,
    driver: ride.driver ? {
      id: ride.driver.id,
      name: ride.driver.name,
      phone: ride.driver.phone,
      vehicle_plate: ride.driver.vehicle_plate,
      lat: ride.driver.last_lat ? Number(ride.driver.last_lat) : null,
      lng: ride.driver.last_lng ? Number(ride.driver.last_lng) : null,
    } : null,
    passenger: {
      id: ride.passenger.id,
      name: ride.passenger.name,
      phone: ride.passenger.phone,
    },
    quoted_price: ride.quoted_price ? Number(ride.quoted_price) : null,
    requested_at: ride.requested_at.toISOString(),
    started_at: ride.started_at?.toISOString() || null,
    triggered_at: new Date().toISOString(),
  };

  const event = await prisma.ride_emergency_events.create({
    data: {
      ride_id: rideId,
      triggered_by_type: triggeredByType,
      triggered_by_id: triggeredById,
      trigger_source: 'emergency_button',
      status: 'active',
      snapshot,
    },
  });

  console.log(`[EMERGENCY_VAULT] CREATED event_id=${event.id} ride_id=${rideId} by=${triggeredByType}:${triggeredById}`);
  return { event, created: true };
}

export async function appendTrailPoint(rideId: string, data: { lat: number; lng: number; speed?: number; heading?: number; source: string }) {
  const event = await prisma.ride_emergency_events.findFirst({
    where: { ride_id: rideId, status: 'active' },
    select: { id: true },
  });
  if (!event) return null;

  try {
    return await prisma.emergency_location_trail.create({
      data: {
        emergency_event_id: event.id,
        source: data.source,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        captured_at: new Date(),
      },
    });
  } catch (e: any) {
    // Unique constraint violation (duplicate timestamp) — ignore
    if (e.code === 'P2002') return null;
    throw e;
  }
}
