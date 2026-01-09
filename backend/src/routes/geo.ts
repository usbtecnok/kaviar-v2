import { Router, Request, Response } from 'express';
import { GeoResolveService } from '../services/geo-resolve';

const router = Router();
const geoResolveService = new GeoResolveService();

/**
 * GET /api/geo/resolve
 * Resolve geographic coordinates to community area using PostGIS
 * Priority: COMUNIDADE > BAIRRO/NEIGHBORHOOD > others (hierarchical)
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

    // Use centralized geo resolve service
    const result = await geoResolveService.resolveCoordinates(
      latitude, 
      longitude, 
      type as string
    );

    if (result.match) {
      return res.json({
        match: true,
        area: result.area
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
