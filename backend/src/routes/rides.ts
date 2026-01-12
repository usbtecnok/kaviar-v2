import { Router, Request, Response } from 'express';
import { CommunityService } from '../services/community';

const router = Router();
const communityService = new CommunityService();

/**
 * POST /api/rides/resolve-location
 * Canonical algorithm for ride location resolution
 * 1. Resolve lat/lng → neighborhood (always required)
 * 2. If communityId provided → validate it belongs to neighborhood
 * 3. Return both neighborhood and optional community
 */
router.post('/resolve-location', async (req: Request, res: Response) => {
  try {
    const { lat, lon, communityId } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat and lon'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude) || 
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates'
      });
    }

    const result = await communityService.resolveRideLocation(
      latitude, 
      longitude, 
      communityId
    );

    if (!result) {
      return res.json({
        resolved: false,
        message: 'Location outside service area'
      });
    }

    return res.json({
      resolved: true,
      neighborhoodId: result.neighborhoodId,
      communityId: result.communityId || null
    });

  } catch (error) {
    console.error('Ride location resolve error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;
