import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/geo/resolve
 * Resolve geographic coordinates to community area using PostGIS
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

    // Build query with optional type filter
    let whereClause = 'WHERE geom IS NOT NULL AND is_active = true';
    if (type) {
      // Note: assuming there's a type field, adjust as needed
      whereClause += ` AND name ILIKE '%${type}%'`;
    }

    // PostGIS query: ST_Covers includes boundary points
    // Order by area (smallest first) in case of overlapping polygons
    const result = await prisma.$queryRaw`
      SELECT id, name, description, is_active
      FROM communities 
      WHERE geom IS NOT NULL 
        AND is_active = true
        AND ST_Covers(geom, ST_SetSRID(ST_Point(${longitude}, ${latitude}), 4326))
      ORDER BY ST_Area(geom::geography) ASC
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
