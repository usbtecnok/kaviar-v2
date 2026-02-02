const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Config
const ANCHOR_DETECT_METERS = 400;
const TERRITORY_RADIUS_METERS = 800;

// Haversine distance calculation (meters)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Detect active anchor (favorite within 400m of origin)
async function detectActiveAnchor(originLat, originLng, passengerId) {
  const favorites = await prisma.passenger_favorite_locations.findMany({
    where: { passenger_id: passengerId }
  });

  if (!favorites || favorites.length === 0) {
    return null;
  }

  let closestFavorite = null;
  let minDistance = Infinity;

  for (const fav of favorites) {
    const distance = calculateDistance(
      originLat,
      originLng,
      parseFloat(fav.lat),
      parseFloat(fav.lng)
    );

    if (distance <= ANCHOR_DETECT_METERS && distance < minDistance) {
      minDistance = distance;
      closestFavorite = {
        id: fav.id,
        type: fav.type,
        label: fav.label,
        lat: parseFloat(fav.lat),
        lng: parseFloat(fav.lng),
        distance
      };
    }
  }

  return closestFavorite;
}

// Get driver's best base point (primary or secondary, whichever is closer to anchor)
async function getDriverBasePoint(driver, anchor) {
  const bases = [];

  // Primary base (geofence centroid or virtual_fence_center)
  if (driver.virtual_fence_center_lat && driver.virtual_fence_center_lng) {
    bases.push({
      type: 'primary_virtual',
      lat: parseFloat(driver.virtual_fence_center_lat),
      lng: parseFloat(driver.virtual_fence_center_lng)
    });
  } else if (driver.neighborhood_id) {
    // Get geofence centroid
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id: driver.neighborhood_id },
      select: { center_lat: true, center_lng: true }
    });

    if (neighborhood?.center_lat && neighborhood?.center_lng) {
      bases.push({
        type: 'primary_geofence',
        lat: parseFloat(neighborhood.center_lat),
        lng: parseFloat(neighborhood.center_lng)
      });
    }
  }

  // Secondary base (if enabled)
  if (
    driver.secondary_base_enabled &&
    driver.secondary_base_lat &&
    driver.secondary_base_lng
  ) {
    bases.push({
      type: 'secondary',
      lat: parseFloat(driver.secondary_base_lat),
      lng: parseFloat(driver.secondary_base_lng)
    });
  }

  if (bases.length === 0) {
    return null;
  }

  // If no anchor, return primary
  if (!anchor) {
    return bases[0];
  }

  // Return base closest to anchor
  let closestBase = bases[0];
  let minDistance = calculateDistance(
    anchor.lat,
    anchor.lng,
    bases[0].lat,
    bases[0].lng
  );

  for (let i = 1; i < bases.length; i++) {
    const distance = calculateDistance(
      anchor.lat,
      anchor.lng,
      bases[i].lat,
      bases[i].lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestBase = bases[i];
    }
  }

  closestBase.distanceToAnchor = minDistance;
  return closestBase;
}

// Calculate matching score for a driver
async function calculateMatchingScore(driver, matchType, anchor, pickupLat, pickupLng) {
  let score = 0;

  // 1. Territory score (main component)
  switch (matchType) {
    case 'SAME_NEIGHBORHOOD':
      score += 0;
      break;
    case 'ADJACENT_NEIGHBORHOOD':
    case 'DIFFERENT_NEIGHBORHOOD':
    case 'FALLBACK_800M':
      score += 10;
      break;
    case 'OUTSIDE_FENCE':
      score += 30;
      break;
    default:
      score += 30;
  }

  // 2. Proximity to anchor (if anchor exists)
  if (anchor) {
    const basePoint = await getDriverBasePoint(driver, anchor);

    if (basePoint && basePoint.distanceToAnchor !== undefined) {
      const distance = basePoint.distanceToAnchor;

      if (distance <= 800) {
        score += 0;
      } else if (distance <= 2000) {
        score += 5;
      } else {
        score += 15;
      }
    }
  }

  // 3. Pickup distance (if driver has current location)
  if (driver.last_lat && driver.last_lng && pickupLat && pickupLng) {
    const pickupDistance = calculateDistance(
      parseFloat(driver.last_lat),
      parseFloat(driver.last_lng),
      pickupLat,
      pickupLng
    );

    // Normalize: closer is better
    if (pickupDistance <= 1000) {
      score += 0;
    } else if (pickupDistance <= 3000) {
      score += 2;
    } else {
      score += 5;
    }
  }

  return score;
}

// Rank drivers by score (lower is better)
async function rankDrivers(drivers, passengerId, originLat, originLng, matchTypes) {
  const featureEnabled = process.env.FEATURE_PASSENGER_FAVORITES_MATCHING === 'true';

  if (!featureEnabled) {
    // Feature flag OFF: return drivers as-is (no reordering)
    return drivers;
  }

  // Detect active anchor
  const anchor = await detectActiveAnchor(originLat, originLng, passengerId);

  // Calculate score for each driver
  const driversWithScores = await Promise.all(
    drivers.map(async (driver, index) => {
      const matchType = matchTypes[index] || 'OUTSIDE_FENCE';
      const score = await calculateMatchingScore(
        driver,
        matchType,
        anchor,
        originLat,
        originLng
      );

      return {
        ...driver,
        _matchingScore: score,
        _anchor: anchor ? anchor.type : null
      };
    })
  );

  // Sort by score (ascending: lower is better)
  driversWithScores.sort((a, b) => a._matchingScore - b._matchingScore);

  return driversWithScores;
}

module.exports = {
  calculateDistance,
  detectActiveAnchor,
  getDriverBasePoint,
  calculateMatchingScore,
  rankDrivers,
  ANCHOR_DETECT_METERS,
  TERRITORY_RADIUS_METERS
};
