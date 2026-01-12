import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface GeoResolveResult {
  match: boolean;
  resolvedArea?: {
    id: string;
    name: string;
    type: 'neighborhood';
  } | null;
}

/**
 * Centralized geo resolution service
 * Single source of truth for hierarchical geofence logic
 */
export class GeoResolveService {
  
  /**
   * Resolve coordinates to area with hierarchical priority
   * Priority: COMUNIDADE > BAIRRO/NEIGHBORHOOD > others
   * Tiebreaker: smallest area (most specific)
   */
  async resolveCoordinates(lat: number, lon: number): Promise<GeoResolveResult> {
    try {
      // Validate coordinate ranges
      if (isNaN(lat) || isNaN(lon) || 
          lat < -90 || lat > 90 || 
          lon < -180 || lon > 180) {
        return { match: false, resolvedArea: null };
      }

      const result = await prisma.$queryRaw`
        SELECT n.id, n.name
        FROM neighborhood_geofences ng
        JOIN neighborhoods n ON ng.neighborhood_id = n.id
        WHERE n.is_active = true
          AND ng.geom IS NOT NULL
          AND ST_Covers(ng.geom, ST_SetSRID(ST_Point(${lon}, ${lat}), 4326))
        ORDER BY ST_Area(ng.geom::geography) ASC
        LIMIT 1
      `;

      if (Array.isArray(result) && result.length > 0) {
        const area = result[0] as any;
        return {
          match: true,
          resolvedArea: {
            id: area.id,
            name: area.name,
            type: 'neighborhood'
          }
        };
      }

      return { match: false, resolvedArea: null };
    } catch (error) {
      console.error('Geo resolve error:', error);
      return { match: false, resolvedArea: null };
    }
  }

  /**
   * Check if coordinates are within any active geofence area
   */
  async isWithinGeofence(lat: number, lon: number): Promise<boolean> {
    const result = await this.resolveCoordinates(lat, lon);
    return result.match;
  }
}
