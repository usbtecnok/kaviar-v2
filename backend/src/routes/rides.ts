import { Router, Request, Response } from 'express';
import { CommunityService } from '../services/community';
import { RideService } from '../services/ride';

const router = Router();
const communityService = new CommunityService();
const rideService = new RideService();

/**
 * POST /api/rides/resolve-location
 * Canonical algorithm for ride location resolution
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

/**
 * POST /api/rides
 * Canonical favela ride creation flow
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      pickup,
      dropoff,
      passengerId, 
      communityId,
      type,
      paymentMethod 
    } = req.body;

    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng || !passengerId) {
      return res.status(400).json({
        error: 'Missing required fields: pickup{lat,lng}, dropoff{lat,lng}, passengerId'
      });
    }

    const rideId = await rideService.createRide({
      pickup: { lat: parseFloat(pickup.lat), lng: parseFloat(pickup.lng) },
      dropoff: { lat: parseFloat(dropoff.lat), lng: parseFloat(dropoff.lng) },
      passengerId,
      communityId, // opcional - dica, não ordem
      type,
      paymentMethod
    });

    return res.json({
      success: true,
      rideId
    });

  } catch (error) {
    console.error('Create ride error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/rides/:id/operational-context
 * Get operational context from immutable ride anchors
 */
router.get('/:id/operational-context', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const context = await rideService.getRideOperationalContext(id);
    
    return res.json(context);

  } catch (error) {
    console.error('Get operational context error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
