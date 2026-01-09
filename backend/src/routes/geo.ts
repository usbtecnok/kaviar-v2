import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/geo/resolve
 * Resolve geographic coordinates to community area using PostGIS
 * Priority: COMUNIDADE > BAIRRO (smaller/more specific areas first)
 * Query params: lat, lon, type (optional)
 */
router.get('/resolve', async (req: Request, res: Response) => {
  try {
    const { lat, lon, type } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat and lon'
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    // Validate coordinate ranges
    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates. Lat must be [-90,90], Lon must be [-180,180]'
      });
    }

    // Build query with hierarchical priority: COMUNIDADE > BAIRRO/NEIGHBORHOOD
    // Order by: 1) comunidade first, 2) bairro/neighborhood, 3) smallest area (most specific)
    let whereClause = 'WHERE geom IS NOT NULL AND is_active = true';
    if (type) {
      whereClause += ` AND id LIKE '${type}-%'`;
    }

    const result = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      ${Prisma.raw(whereClause)}
        AND ST_Covers(geom, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326))
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
      return res.json({
        match: true,
        area: {
          id: area.id,
          name: area.name,
          description: area.description,
          active: area.is_active
        }
      });
    } else {
      return res.json({
        match: false
      });
    }

  } catch (error) {
    console.error('Geo resolve error:', error);
    return res.status(500).json({
      error: 'Internal server error during geographic resolution'
    });
  }
});

export default router;
