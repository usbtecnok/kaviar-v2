import { prisma } from '../lib/prisma';
import { resolveTerritory } from './territory-resolver.service';

export type CreditMatchType = 'LOCAL' | 'EXTERNAL';

export interface CreditCost {
  cost: number;
  matchType: CreditMatchType;
  reason: string;
}

/**
 * Classify ride as LOCAL (1 credit) or EXTERNAL (2 credits).
 *
 * LOCAL  = pickup OR dropoff resolves to the driver's home neighborhood
 * EXTERNAL = neither pickup nor dropoff touches the driver's neighborhood
 *
 * Reuses the existing territory-resolver (PostGIS → geofence → fallback_800m → outside).
 */
export async function calculateCreditCost(
  driverId: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<CreditCost> {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { neighborhood_id: true }
  });

  if (!driver?.neighborhood_id) {
    return { cost: 2, matchType: 'EXTERNAL', reason: 'driver_no_neighborhood' };
  }

  const [pickup, dropoff] = await Promise.all([
    resolveTerritory(originLng, originLat),
    resolveTerritory(destLng, destLat)
  ]);

  const touchesHome =
    pickup.neighborhood?.id === driver.neighborhood_id ||
    dropoff.neighborhood?.id === driver.neighborhood_id;

  return touchesHome
    ? { cost: 1, matchType: 'LOCAL', reason: 'ride_touches_home_neighborhood' }
    : { cost: 2, matchType: 'EXTERNAL', reason: 'ride_outside_home_neighborhood' };
}
