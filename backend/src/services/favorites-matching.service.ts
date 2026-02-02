import { prisma } from '../lib/prisma';
import { isFeatureEnabled } from './feature-flag.service';

const ANCHOR_DETECT_METERS = 400;
const TERRITORY_RADIUS_METERS = 800;

interface Coordinate {
  lat: number;
  lng: number;
}

interface Favorite {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: string;
}

interface DriverWithScore {
  id: string;
  score: number;
  distance: number;
  base: Coordinate | null;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Detect active anchor (favorite location near pickup)
 * Returns closest favorite within ANCHOR_DETECT_METERS or null
 */
function detectAnchor(pickup: Coordinate, favorites: Favorite[]): Favorite | null {
  let closestFavorite: Favorite | null = null;
  let minDistance = Infinity;

  for (const fav of favorites) {
    const distance = calculateDistance(pickup.lat, pickup.lng, fav.lat, fav.lng);
    if (distance <= ANCHOR_DETECT_METERS && distance < minDistance) {
      minDistance = distance;
      closestFavorite = fav;
    }
  }

  return closestFavorite;
}

/**
 * Get driver's best base (closest to anchor if exists)
 * Priority: last_lat/lng > secondary_base (if enabled)
 */
function getDriverBase(driver: any, anchor: Favorite | null): Coordinate | null {
  const bases: Array<{ coord: Coordinate; priority: number }> = [];

  // Last known location (primary base)
  if (driver.last_lat && driver.last_lng) {
    bases.push({
      coord: {
        lat: Number(driver.last_lat),
        lng: Number(driver.last_lng)
      },
      priority: 1
    });
  }

  // Secondary base (if enabled)
  if (driver.secondary_base_enabled && driver.secondary_base_lat && driver.secondary_base_lng) {
    bases.push({
      coord: {
        lat: Number(driver.secondary_base_lat),
        lng: Number(driver.secondary_base_lng)
      },
      priority: 2
    });
  }

  if (bases.length === 0) return null;

  // If no anchor, return highest priority base
  if (!anchor) {
    bases.sort((a, b) => a.priority - b.priority);
    return bases[0].coord;
  }

  // If anchor exists, return base closest to anchor
  let closestBase = bases[0].coord;
  let minDistance = calculateDistance(anchor.lat, anchor.lng, closestBase.lat, closestBase.lng);

  for (let i = 1; i < bases.length; i++) {
    const distance = calculateDistance(anchor.lat, anchor.lng, bases[i].coord.lat, bases[i].coord.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestBase = bases[i].coord;
    }
  }

  return closestBase;
}

/**
 * Calculate matching score for driver
 * Lower score = better match
 */
function calculateScore(
  driverBase: Coordinate | null,
  anchor: Favorite | null,
  pickup: Coordinate
): number {
  let score = 0;

  // No base = worst score
  if (!driverBase) return 999;

  const pickupDistance = calculateDistance(pickup.lat, pickup.lng, driverBase.lat, driverBase.lng);

  // Pickup distance component
  if (pickupDistance <= 1000) {
    score += 0;
  } else if (pickupDistance <= 3000) {
    score += 2;
  } else {
    score += 5;
  }

  // Anchor proximity component (only if anchor exists)
  if (anchor) {
    const anchorDistance = calculateDistance(anchor.lat, anchor.lng, driverBase.lat, driverBase.lng);
    
    if (anchorDistance <= TERRITORY_RADIUS_METERS) {
      score += 0;
    } else if (anchorDistance <= 2000) {
      score += 5;
    } else {
      score += 15;
    }
  }

  return score;
}

/**
 * Rank drivers based on passenger favorites matching
 * Returns drivers sorted by score (best match first)
 */
export async function rankDriversByFavorites(
  drivers: any[],
  passengerId: string,
  pickup: Coordinate
): Promise<any[]> {
  // Check feature flag
  const isEnabled = await isFeatureEnabled('passenger_favorites_matching', passengerId);
  
  if (!isEnabled || drivers.length === 0) {
    return drivers; // Return original order
  }

  // Get passenger favorites
  const favorites = await prisma.passenger_favorite_locations.findMany({
    where: { passenger_id: passengerId },
    select: {
      id: true,
      lat: true,
      lng: true,
      label: true,
      type: true
    }
  });

  if (favorites.length === 0) {
    return drivers; // No favorites = no reordering
  }

  // Detect anchor
  const anchor = detectAnchor(pickup, favorites.map(f => ({
    id: f.id,
    lat: Number(f.lat),
    lng: Number(f.lng),
    label: f.label,
    type: f.type
  })));

  // Calculate scores for all drivers
  const driversWithScores: DriverWithScore[] = drivers.map(driver => {
    const base = getDriverBase(driver, anchor);
    const score = calculateScore(base, anchor, pickup);
    const distance = base 
      ? calculateDistance(pickup.lat, pickup.lng, base.lat, base.lng)
      : 999999;

    return {
      id: driver.id,
      score,
      distance,
      base,
      ...driver
    };
  });

  // Sort by score (ascending), then by distance (tie-breaker)
  driversWithScores.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.distance - b.distance;
  });

  // Log ranking decision
  if (anchor) {
    console.log(`[favorites-matching] Anchor detected: ${anchor.label} (${anchor.type})`);
    console.log(`[favorites-matching] Ranked ${driversWithScores.length} drivers, top 3 scores:`, 
      driversWithScores.slice(0, 3).map(d => ({ id: d.id, score: d.score, distance: Math.round(d.distance) }))
    );
  }

  return driversWithScores;
}
