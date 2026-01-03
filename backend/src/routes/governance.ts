import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Listar comunidades ativas
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.community.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true }
    });
    res.json({ success: true, data: communities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as governanceRoutes };
