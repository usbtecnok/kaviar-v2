import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { DriverGovernanceController } from '../modules/governance/driver-controller';
import { RideController } from '../modules/governance/ride-controller';
import { RatingController } from '../modules/rating/controller';
import { checkDriverForLocationUpdate } from '../middlewares/driver-enforcement';

const router = Router();
const prisma = new PrismaClient();
const driverController = new DriverGovernanceController();
const rideController = new RideController();
const ratingController = new RatingController();

// Listar comunidades ativas
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.community.findMany({
      where: { isActive: true },
      include: {
        geofenceData: {
          select: {
            centerLat: true,
            centerLng: true,
            minLat: true,
            minLng: true,
            maxLat: true,
            maxLng: true,
            confidence: true,
            isVerified: true
          }
        }
      }
    });

    // Merge geofence data with community data
    const enrichedCommunities = communities.map(community => ({
      id: community.id,
      name: community.name,
      description: community.description,
      centerLat: community.geofenceData?.centerLat || community.centerLat,
      centerLng: community.geofenceData?.centerLng || community.centerLng,
      bbox: community.geofenceData ? {
        minLat: community.geofenceData.minLat,
        minLng: community.geofenceData.minLng,
        maxLat: community.geofenceData.maxLat,
        maxLng: community.geofenceData.maxLng
      } : null
    }));

    res.json({ success: true, data: enrichedCommunities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Obter geofence de uma comunidade específica
router.get('/communities/:id/geofence', async (req, res) => {
  try {
    const { id } = req.params;
    
    const geofence = await prisma.communityGeofence.findUnique({
      where: { communityId: id },
      select: {
        geojson: true,
        centerLat: true,
        centerLng: true,
        confidence: true,
        isVerified: true,
        source: true,
        updatedAt: true
      }
    });

    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        error: 'Geofence não encontrado para esta comunidade' 
      });
    }

    const response = {
      centerLat: geofence.centerLat,
      centerLng: geofence.centerLng,
      geometry: geofence.geojson ? JSON.parse(geofence.geojson) : null,
      confidence: geofence.confidence,
      isVerified: geofence.isVerified,
      source: geofence.source,
      updatedAt: geofence.updatedAt
    };

    res.json({ success: true, data: response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

// Cadastrar passageiro
router.post('/passenger', async (req, res) => {
  try {
    const { name, email, phone, communityId } = req.body;
    
    const passenger = await prisma.passenger.create({
      data: {
        name,
        email,
        phone,
        communityId,
        status: 'pending'
      }
    });
    
    res.json({ success: true, data: passenger });
  } catch (error: unknown) {
    const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Registrar consentimento LGPD
router.post('/consent', async (req, res) => {
  try {
    const { passengerId, consentType, accepted, ipAddress } = req.body;
    
    const consent = await prisma.userConsent.upsert({
      where: {
        passengerId_consentType: { passengerId, consentType }
      },
      update: {
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress
      },
      create: {
        passengerId,
        consentType,
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress
      }
    });
    
    res.json({ success: true, data: consent });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Cadastrar motorista
router.post('/driver', async (req, res) => {
  try {
    const { name, email, phone, communityId, documentCpf, documentRg, documentCnh, vehiclePlate, vehicleModel } = req.body;

    const driver = await prisma.driver.create({
      data: {
        name,
        email,
        phone,
        communityId,
        documentCpf,
        documentRg,
        documentCnh,
        vehiclePlate,
        vehicleModel,
        status: 'pending'
      }
    });

    res.json({ success: true, data: driver });
  } catch (error: unknown) {
    // Prisma: duplicidade (unique constraint)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta as any)?.target;
      const fields = Array.isArray(target) ? target.join(', ') : (target ?? 'campo único');
      return res.status(409).json({ success: false, error: `Já existe cadastro com este ${fields}.` });
    }

    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Atualizar documentos do motorista
router.put('/driver/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentCpf, documentRg, documentCnh, vehiclePlate, vehicleModel, communityId } = req.body;
    
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        documentCpf,
        documentRg,
        documentCnh,
        vehiclePlate,
        vehicleModel,
        communityId
      }
    });
    
    res.json({ success: true, data: driver });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Cadastrar guia turístico
router.post('/guide', async (req, res) => {
  try {
    const { name, email, phone, communityId, isBilingual, languages, alsoDriver, driverId } = req.body;
    
    const guide = await prisma.touristGuide.create({
      data: {
        name,
        email,
        phone,
        communityId,
        isBilingual,
        languages,
        alsoDriver,
        driverId
      }
    });
    
    res.json({ success: true, data: guide });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Driver governance endpoints
router.post('/driver/consent', driverController.recordConsent);
// Ride endpoints (with geofence)
router.post('/ride/request', rideController.requestRide);

// Location tracking endpoints (with enforcement gates)
router.put('/driver/:id/location', checkDriverForLocationUpdate, rideController.updateDriverLocation);
router.put('/passenger/:id/location', rideController.updatePassengerLocation);

// Rating endpoints
router.post('/ratings', ratingController.createRating);
router.get('/ratings/summary/:type/:id', ratingController.getRatingSummary);

// Neighborhoods (Bairros) endpoints
router.get('/neighborhoods', async (req, res) => {
  try {
    const neighborhoods = await prisma.neighborhood.findMany({
      where: { isActive: true },
      include: {
        geofenceData: {
          select: {
            geofenceType: true,
            area: true,
            perimeter: true,
            source: true
          }
        }
      }
    });

    // Merge geofence data with neighborhood data
    const enrichedNeighborhoods = neighborhoods.map(neighborhood => ({
      id: neighborhood.id,
      name: neighborhood.name,
      description: neighborhood.description,
      zone: neighborhood.zone,
      administrativeRegion: neighborhood.administrativeRegion,
      centerLat: neighborhood.centerLat,
      centerLng: neighborhood.centerLng,
      isVerified: neighborhood.isVerified,
      geofenceType: neighborhood.geofenceData?.geofenceType || null,
      createdAt: neighborhood.createdAt
    }));

    res.json({ success: true, data: enrichedNeighborhoods });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Get specific neighborhood
router.get('/neighborhoods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const neighborhood = await prisma.neighborhood.findUnique({
      where: { id },
      include: {
        geofenceData: true
      }
    });

    if (!neighborhood) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bairro não encontrado' 
      });
    }

    res.json({ success: true, data: neighborhood });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// Get neighborhood geofence
router.get('/neighborhoods/:id/geofence', async (req, res) => {
  try {
    const { id } = req.params;
    
    const geofence = await prisma.neighborhoodGeofence.findUnique({
      where: { neighborhoodId: id },
      select: {
        geofenceType: true,
        coordinates: true,
        source: true,
        sourceUrl: true,
        area: true,
        perimeter: true,
        updatedAt: true
      }
    });

    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        error: 'Geofence não encontrado para este bairro' 
      });
    }

    res.json({ success: true, data: geofence });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

export { router as governanceRoutes };
