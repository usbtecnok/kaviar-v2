import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/public/neighborhoods/:id/geofence (público, sem auth)
router.get('/neighborhoods/:id/geofence', async (req, res) => {
  try {
    const { id } = req.params;
    const communityId = req.query.communityId as string | undefined;

    // 1. Tentar community_geofences (se communityId fornecido)
    if (communityId) {
      const communityGeofence = await prisma.community_geofences.findFirst({
        where: { community_id: communityId },
        select: { id: true, community_id: true, source: true, geojson: true }
      });
      if (communityGeofence) {
        return res.json({ success: true, data: communityGeofence, source: 'community' });
      }
    }

    // 2. Fallback: neighborhood_geofences
    const geofence = await prisma.neighborhood_geofences.findFirst({
      where: { neighborhood_id: id },
      select: { id: true, source: true, coordinates: true }
    });
    if (geofence) {
      return res.json({ success: true, data: geofence, source: 'neighborhood' });
    }

    // 3. Fallback final: círculo 800m
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id },
      select: { center_lat: true, center_lng: true }
    });

    if (!neighborhood?.center_lat || !neighborhood?.center_lng) {
      return res.json({ success: true, data: null });
    }

    const RADIUS_M = 800;
    const EARTH_R = 6371000;
    const lat = Number(neighborhood.center_lat);
    const lng = Number(neighborhood.center_lng);
    const coords: number[][] = [];
    
    for (let i = 0; i <= 32; i++) {
      const angle = (i * 360 / 32) * Math.PI / 180;
      const dx = RADIUS_M * Math.cos(angle);
      const dy = RADIUS_M * Math.sin(angle);
      const newLat = lat + (dy / EARTH_R) * (180 / Math.PI);
      const newLng = lng + (dx / EARTH_R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
      coords.push([newLng, newLat]);
    }

    return res.json({
      success: true,
      data: {
        id: `fallback-${id}`,
        source: 'fallback',
        geojson: JSON.stringify({
          type: 'Polygon',
          coordinates: [coords]
        })
      },
      source: 'fallback'
    });
  } catch (error) {
    console.error('[public/geofence] error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar geofence' });
  }
});

export { router as publicRoutes };
