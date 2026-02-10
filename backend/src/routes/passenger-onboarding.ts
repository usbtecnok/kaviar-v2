import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';

const router = Router();

type ResolutionStatus = 'RESOLVED' | 'UNRESOLVED';
type Resolution = {
  status: ResolutionStatus;
  communityId: string | null;
  neighborhoodId: string | null;
};

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

    // Tentar resolver território (community/neighborhood)
    const resolution: Resolution = {
      status: 'UNRESOLVED',
      communityId: null,
      neighborhoodId: null
    };

    try {
      // Buscar community por geofence (se existir geom PostGIS)
      const community = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT c.id
        FROM communities c
        JOIN community_geofences cg ON c.id = cg.community_id
        WHERE ST_Contains(
          ST_GeomFromGeoJSON(cg.geojson),
          ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)
        )
        LIMIT 1
      `;

      if (community && community.length > 0) {
        resolution.communityId = community[0].id;
        resolution.status = 'RESOLVED';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log('[onboarding/location] Community resolution skipped:', msg);
    }

    try {
      // Buscar neighborhood por geofence
      const neighborhood = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT n.id
        FROM neighborhoods n
        WHERE ST_Contains(
          ST_GeomFromGeoJSON(n.geojson),
          ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)
        )
        LIMIT 1
      `;

      if (neighborhood && neighborhood.length > 0) {
        resolution.neighborhoodId = neighborhood[0].id;
        resolution.status = 'RESOLVED';
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log('[onboarding/location] Neighborhood resolution skipped:', msg);
    }

    // Atualizar community/neighborhood se resolvido
    if (resolution.communityId || resolution.neighborhoodId) {
      await prisma.passengers.update({
        where: { id: passenger.id },
        data: {
          community_id: resolution.communityId,
          neighborhood_id: resolution.neighborhoodId
        }
      });
    }

    console.log(`[onboarding/location] Passenger ${passenger.id}: ${resolution.status}`);

    res.json({
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
