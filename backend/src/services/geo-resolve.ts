import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface GeoResolveResult {
  match: boolean;
  area?: {
    id: string;
    name: string;
    description: string;
    active: boolean;
  };
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
  async resolveCoordinates(lat: number, lon: number, type?: string): Promise<GeoResolveResult> {
    try {
      // Validate coordinate ranges
      if (isNaN(lat) || isNaN(lon) || 
          lat < -90 || lat > 90 || 
          lon < -180 || lon > 180) {
        return { match: false };
      }

      // Build query with hierarchical priority
      let whereClause = 'WHERE geom IS NOT NULL AND is_active = true';
      if (type) {
        whereClause += ` AND id LIKE '${type}-%'`;
      }

      const result = await prisma.$queryRaw`
        SELECT id, name, description, is_active
        FROM communities 
        ${Prisma.raw(whereClause)}
          AND ST_Covers(geom, ST_SetSRID(ST_Point(${lon}, ${lat}), 4326))
        ORDER BY 
          CASE 
            WHEN id LIKE 'comunidade-%' THEN 1 
            WHEN id LIKE 'bairro-%' OR id LIKE 'neighborhood-%' THEN 2 
            ELSE 3 
          END,
          ST_Area(geom::geography) ASC
        LIMIT 1
      `;

      if (Array.isArray(result) && result.length > 0) {
        const area = result[0] as any;
        return {
          match: true,
          area: {
            id: area.id,
            name: area.name,
            description: area.description,
            active: area.is_active
          }
        };
      }

      return { match: false };
    } catch (error) {
      console.error('Geo resolve error:', error);
      return { match: false };
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
