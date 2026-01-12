import { PrismaClient } from '@prisma/client';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

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

      const rows = await prisma.$queryRaw`
        SELECT ng.coordinates, n.id, n.name
        FROM neighborhood_geofences ng
        JOIN neighborhoods n ON n.id = ng.neighborhood_id
        WHERE n.is_active = true
      `;

      const pt = point([lon, lat]);

      for (const row of rows as any[]) {
        if (row.coordinates && booleanPointInPolygon(pt, row.coordinates)) {
          return {
            match: true,
            resolvedArea: {
              id: row.id,
              name: row.name,
              type: 'neighborhood'
            }
          };
        }
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
