import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
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
      select: { id: true, name: true, description: true }
    });
    res.json({ success: true, data: communities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
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
router.put('/driver/:id/documents', driverController.submitDocuments);

// Ride endpoints (with geofence)
router.post('/ride/request', rideController.requestRide);

// Location tracking endpoints (with enforcement gates)
router.put('/driver/:id/location', checkDriverForLocationUpdate, rideController.updateDriverLocation);
router.put('/passenger/:id/location', rideController.updatePassengerLocation);

// Rating endpoints
router.post('/ratings', ratingController.createRating);
router.get('/ratings/summary/:type/:id', ratingController.getRatingSummary);

export { router as governanceRoutes };
