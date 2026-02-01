import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticatePassenger } from '../middlewares/auth';
import { isFeatureEnabled } from '../services/feature-flag.service';

const router = Router();
const prisma = new PrismaClient();

// POST /api/passenger/favorites
router.post('/favorites', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const { lat, lng, label, type } = req.body;

    // Check feature flag
    const isEnabled = await isFeatureEnabled('passenger_favorites_matching', passenger.id);
    
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'Feature not available',
      });
    }

    // Validate input
    if (!lat || !lng || !label) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: lat, lng, label',
      });
    }

    // Create favorite
    const favorite = await prisma.passenger_favorite_locations.create({
      data: {
        passenger_id: passenger.id,
        lat,
        lng,
        label,
        type: type || 'OTHER',
      },
    });

    console.log(`[passenger_favorites_matching] Favorite created: passenger=${passenger.id}, label=${label}`);

    res.status(201).json({
      success: true,
      favorite: {
        id: favorite.id,
        lat: favorite.lat,
        lng: favorite.lng,
        label: favorite.label,
        type: favorite.type,
        created_at: favorite.created_at,
      },
    });
  } catch (error) {
    console.error('[passenger_favorites_matching] Error creating favorite:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

// GET /api/passenger/favorites
router.get('/favorites', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;

    // Check feature flag
    const isEnabled = await isFeatureEnabled('passenger_favorites_matching', passenger.id);
    
    if (!isEnabled) {
      return res.status(403).json({
        success: false,
        error: 'Feature not available',
      });
    }

    const favorites = await prisma.passenger_favorite_locations.findMany({
      where: {
        passenger_id: passenger.id,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`[passenger_favorites_matching] Favorites listed: passenger=${passenger.id}, count=${favorites.length}`);

    res.json({
      success: true,
      favorites: favorites.map(f => ({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        label: f.label,
        type: f.type,
        created_at: f.created_at,
      })),
    });
  } catch (error) {
    console.error('[passenger_favorites_matching] Error listing favorites:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
