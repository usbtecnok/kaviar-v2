import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface GeofenceResult {
  isValid: boolean;
  area?: {
    id: string;
    name: string;
    description: string;
    active: boolean;
  };
}

/**
 * Validate if coordinates are within any active geofence area
 * Uses the same logic as /api/geo/resolve endpoint
 */
export async function validateGeofence(lat: number, lon: number): Promise<GeofenceResult> {
  try {
    // Validate coordinate ranges
    if (isNaN(lat) || isNaN(lon) || 
        lat < -90 || lat > 90 || 
        lon < -180 || lon > 180) {
      return { isValid: false };
    }

    // PostGIS query: ST_Covers includes boundary points
    // Order by area (smallest first) in case of overlapping polygons
    const result = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(${lon}, ${lat}), 4326))
      ORDER BY ST_Area(geom::geography) ASC
      LIMIT 1
    `;

    if (Array.isArray(result) && result.length > 0) {
      const area = result[0] as any;
      return {
        isValid: true,
        area: {
          id: area.id,
          name: area.name,
          description: area.description,
          active: area.is_active
        }
      };
    }

    return { isValid: false };
  } catch (error) {
    console.error('Geofence validation error:', error);
    return { isValid: false };
  }
}
