export const CITY_CENTERS = {
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, zoom: 11 },
  'sao paulo': { lat: -23.5505, lng: -46.6333, zoom: 11 },
  tambau: { lat: -21.705, lng: -47.274, zoom: 13 }
};

export function normalizeCityKey(city) {
  return String(city || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getCityCenter(city) {
  const key = normalizeCityKey(city);
  return CITY_CENTERS[key] || { lat: -14.235, lng: -51.9253, zoom: 4 };
}

export function isValidPolygonCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return false;
  const ring = coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return false;
  return ring.every((pair) => Array.isArray(pair) && pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isCompatibleWithCity(coordinates, city) {
  const center = getCityCenter(city);
  const firstPoint = coordinates?.[0]?.[0];
  if (!Array.isArray(firstPoint)) return false;
  return haversineKm(firstPoint[1], firstPoint[0], center.lat, center.lng) <= 250;
}

export function shouldFetchGeofence(neighborhood) {
  return neighborhood?.has_geofence === true;
}
