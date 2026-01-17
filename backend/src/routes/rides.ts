import { Router, Request, Response } from 'express';
import { CommunityService } from '../services/community';
import { RideService } from '../services/ride';
import { DispatchService } from '../services/dispatch';
import { authenticateDriver } from '../middlewares/auth';
import { prisma } from '../config/database';

const router = Router();
const communityService = new CommunityService();
const rideService = new RideService();
const dispatchService = new DispatchService();

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

/**
 * POST /api/rides/:id/dispatch
 * Dispatch drivers based on canonical operational profiles
 */
router.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await dispatchService.dispatchDrivers(id);
    
    if (!result.success) {
      await dispatchService.updateRideStatus(id, result);
    }
    
    return res.json(result);

  } catch (error) {
    console.error('Dispatch drivers error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * PUT /api/rides/:id/accept
 * Driver accepts a ride
 */
router.put('/:id/accept', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = (req as any).userId;

    // Check if ride exists
    const ride = await prisma.rides.findUnique({
      where: { id }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Corrida não encontrada'
      });
    }

    // Check if ride is in REQUESTED status
    if (ride.status !== 'requested') {
      return res.status(400).json({
        success: false,
        error: `Corrida não pode ser aceita. Status atual: ${ride.status}`
      });
    }

    // Update ride: associate driver and change status to accepted
    const updatedRide = await prisma.rides.update({
      where: { id },
      data: {
        driver_id: driverId,
        status: 'accepted',
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      ride: {
        id: updatedRide.id,
        status: updatedRide.status,
        driver_id: updatedRide.driver_id
      }
    });

  } catch (error) {
    console.error('Error accepting ride:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao aceitar corrida'
    });
  }
});

/**
 * PUT /api/rides/:id/complete
 * Driver completes a ride
 */
router.put('/:id/complete', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driverId = (req as any).userId;

    // Check if ride exists
    const ride = await prisma.rides.findUnique({
      where: { id }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Corrida não encontrada'
      });
    }

    // Check if ride belongs to this driver
    if (ride.driver_id !== driverId) {
      return res.status(403).json({
        success: false,
        error: 'Você não está associado a esta corrida'
      });
    }

    // Check if ride is in ACCEPTED status
    if (ride.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Corrida não pode ser finalizada. Status atual: ${ride.status}`
      });
    }

    // Update ride: change status to completed
    const updatedRide = await prisma.rides.update({
      where: { id },
      data: {
        status: 'completed',
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      ride: {
        id: updatedRide.id,
        status: updatedRide.status
      }
    });

  } catch (error) {
    console.error('Error completing ride:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao finalizar corrida'
    });
  }
});

export default router;
