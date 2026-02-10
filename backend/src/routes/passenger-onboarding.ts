import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';
import { resolveTerritory } from '../services/territory-resolver.service';

const router = Router();

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().optional()
});

// POST /api/passenger/onboarding/location
router.post('/location', authenticatePassenger, async (req, res) => {
  try {
    const passenger = (req as any).passenger;
    const { lat, lng, accuracy_m } = locationSchema.parse(req.body);

    // Atualizar localização do passageiro
    await prisma.passengers.update({
      where: { id: passenger.id },
      data: {
        last_lat: lat,
        last_lng: lng,
        last_location_updated_at: new Date()
      }
    });

    // Resolver território usando serviço centralizado
    const territory = await resolveTerritory(lng, lat);

    // Atualizar community/neighborhood se resolvido
    if (territory.resolved) {
      await prisma.passengers.update({
        where: { id: passenger.id },
        data: {
          community_id: territory.community?.id || null,
          neighborhood_id: territory.neighborhood?.id || null
        }
      });
    }

    console.log(`[onboarding/location] Passenger ${passenger.id}: method=${territory.method}, resolved=${territory.resolved}`);

    res.json({
      success: true,
      resolution: {
        status: territory.resolved ? 'RESOLVED' : 'UNRESOLVED',
        communityId: territory.community?.id || null,
        communityName: territory.community?.name || null,
        neighborhoodId: territory.neighborhood?.id || null,
        neighborhoodName: territory.neighborhood?.name || null,
        method: territory.method,
        fallbackMeters: territory.fallbackMeters || null
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    console.error('[onboarding/location] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar localização'
    });
  }
});

export default router;
      success: true,
      resolution
    });
  } catch (error) {
    console.error('[onboarding/location] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao processar localização'
    });
  }
});

export default router;
