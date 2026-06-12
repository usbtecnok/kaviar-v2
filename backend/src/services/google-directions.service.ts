/**
 * Google Directions service for real route distance + duration.
 * Fallback: returns null if API fails (caller uses haversine).
 */

const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY || process.env.GOOGLE_DIRECTIONS_KEY || '';

export interface RouteResult {
  distance_km: number;
  duration_min: number;
  source: 'google_route';
}

export async function getRouteDistance(
  originLat: number, originLng: number,
  destLat: number, destLng: number
): Promise<RouteResult | null> {
  if (!GOOGLE_KEY) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&language=pt-BR&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) {
      console.warn(`[DIRECTIONS] status=${data.status} origin=${originLat},${originLng} dest=${destLat},${destLng}`);
      return null;
    }

    const leg = data.routes[0].legs[0];
    return {
      distance_km: Math.round(leg.distance.value / 10) / 100, // meters → km (2 decimals)
      duration_min: Math.round(leg.duration.value / 60 * 100) / 100, // seconds → min
      source: 'google_route',
    };
  } catch (err) {
    console.error('[DIRECTIONS] API error:', (err as Error).message?.slice(0, 80));
    return null;
  }
}
