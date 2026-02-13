import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { calculateTripFee } from '../services/fee-calculation';
import { resolveTerritory } from '../services/territory-resolver.service';

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

/**
 * GET /api/public/territory/coverage-check
 * Valida cobertura territorial (read-only)
 */
router.get('/territory/coverage-check', async (req, res) => {
  try {
    const { driverId, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;

    if (!driverId || !pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros obrigatórios: driverId, pickupLat, pickupLng, dropoffLat, dropoffLng'
      });
    }

    const result = await calculateTripFee(
      driverId as string,
      Number(pickupLat),
      Number(pickupLng),
      Number(dropoffLat),
      Number(dropoffLng),
      100, // Valor dummy
      'São Paulo'
    );

    res.json({
      success: true,
      data: {
        covered: result.feePercentage < 20,
        matchType: result.matchType,
        feePercentage: result.feePercentage,
        reason: result.reason,
        driverHomeNeighborhood: result.driverHomeNeighborhood,
        pickupNeighborhood: result.pickupNeighborhood,
        dropoffNeighborhood: result.dropoffNeighborhood
      }
    });
  } catch (error) {
    console.error('[public/coverage-check] error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao validar cobertura' });
  }
});

/**
 * GET /api/public/territory/resolution-history
 * Histórico de resoluções territoriais (read-only)
 */
router.get('/territory/resolution-history', async (req, res) => {
  try {
    const { passengerId, limit = '10' } = req.query;

    if (!passengerId) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro obrigatório: passengerId'
      });
    }

    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId as string },
      select: {
        id: true,
        last_lat: true,
        last_lng: true,
        last_location_updated_at: true,
        community_id: true,
        neighborhood_id: true,
        communities: { select: { name: true } },
        neighborhoods: { select: { name: true } }
      }
    });

    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    }

    // Buscar histórico (última localização)
    const history: any[] = [];
    if (passenger.last_lat && passenger.last_lng) {
      const lat = Number(passenger.last_lat);
      const lng = Number(passenger.last_lng);
      const territory = await resolveTerritory(lng, lat);
      history.push({
        timestamp: passenger.last_location_updated_at || new Date(),
        lat,
        lng,
        method: territory.method,
        resolved: territory.resolved,
        communityName: territory.community?.name || null,
        neighborhoodName: territory.neighborhood?.name || null,
        fallbackMeters: territory.fallbackMeters || null
      });
    }

    const stats = {
      totalCaptures: history.length,
      resolvedCount: history.filter(h => h.resolved).length,
      resolutionRate: history.length > 0 ? Number((history.filter(h => h.resolved).length / history.length * 100).toFixed(1)) : 0,
      methodBreakdown: history.reduce((acc, h) => {
        acc[h.method] = (acc[h.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      data: {
        passengerId: passenger.id,
        currentTerritory: passenger.community_id || passenger.neighborhood_id ? {
          communityId: passenger.community_id,
          communityName: passenger.communities?.name || null,
          neighborhoodId: passenger.neighborhood_id,
          neighborhoodName: passenger.neighborhoods?.name || null,
          lastUpdated: passenger.last_location_updated_at
        } : null,
        resolutionHistory: history.slice(0, Number(limit)),
        stats
      }
    });
  } catch (error) {
    console.error('[public/resolution-history] error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar histórico' });
  }
});

export { router as publicRoutes };
