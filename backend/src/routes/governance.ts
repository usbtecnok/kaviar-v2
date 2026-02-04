import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { RatingController } from '../modules/rating/controller';

const router = Router();
const ratingController = new RatingController();

// Schemas
const passengerCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().trim().email('Email inválido').min(1, 'Email é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),
  communityId: z.string().optional()
});

const passengerLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const consentSchema = z.object({
  passengerId: z.string(),
  consentType: z.string(),
  accepted: z.boolean(),
  ipAddress: z.string()
});

// POST /api/governance/passenger - Create passenger
router.post('/passenger', async (req, res) => {
  try {
    const data = passengerCreateSchema.parse(req.body);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Validate communityId: only save if it's a valid UUID
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };
    
    const communityId = data.communityId && isValidUUID(data.communityId) 
      ? data.communityId 
      : null;
    
    // Create passenger with ACTIVE status (no approval needed)
    const passenger = await prisma.passengers.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_hash: hashedPassword,
        neighborhood_id: data.neighborhoodId,
        community_id: communityId,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: { 
        id: passenger.id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
        status: passenger.status
      }
    });
  } catch (error) {
    console.error('Error creating passenger:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar passageiro'
    });
  }
});

// POST /api/governance/consent - Record LGPD consent
router.post('/consent', async (req, res) => {
  try {
    const data = consentSchema.parse(req.body);
    
    await prisma.user_consents.upsert({
      where: {
        passenger_id_consent_type: { 
          passenger_id: data.passengerId, 
          consent_type: data.consentType 
        }
      },
      update: {
        accepted: data.accepted,
        ip_address: data.ipAddress,
        accepted_at: data.accepted ? new Date() : null
      },
      create: {
        id: randomUUID(),
        passenger_id: data.passengerId,
        consent_type: data.consentType,
        accepted: data.accepted,
        ip_address: data.ipAddress,
        accepted_at: data.accepted ? new Date() : null,
        created_at: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar consentimento'
    });
  }
});

// GET /api/governance/communities - List communities
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.communities.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ 
      success: true, 
      data: communities 
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar comunidades'
    });
  }
});

// GET /api/governance/neighborhoods - List neighborhoods (bairros)
router.get('/neighborhoods', async (req, res) => {
  const requestId = randomUUID();
  try {
    const neighborhoods = await prisma.neighborhoods.findMany({
      select: {
        id: true,
        name: true,
        // city: true, // HOTFIX: prod DB sem coluna city
        zone: true,
        area_type: true,
        is_active: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ 
      success: true, 
      data: neighborhoods 
    });
  } catch (error: any) {
    console.error(`[governance] neighborhoods error requestId=${requestId}`, {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
      clientVersion: error?.clientVersion,
    });
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar bairros',
      requestId
    });
  }
});

// Driver registration schemas
const driverCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),
  communityId: z.string().optional(),
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.string().optional()
});

// Guide registration schemas
const guideCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  communityId: z.string().optional(),
  isBilingual: z.boolean().default(false),
  languages: z.array(z.string()).default([]),
  alsoDriver: z.boolean().default(false)
});

// POST /api/governance/driver - Create driver (CADASTRO INICIAL)
router.post('/driver', async (req, res) => {
  try {
    const data = driverCreateSchema.parse(req.body);
    
    // Check if email already exists
    const existingDriver = await prisma.drivers.findUnique({ where: { email: data.email } });
    if (existingDriver) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email já cadastrado' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Log incoming data
    console.log('[GOV] familyBonusAccepted incoming:', data.familyBonusAccepted);
    console.log('[GOV] familyProfile incoming:', data.familyProfile);
    console.log('[GOV] Full payload:', JSON.stringify(data, null, 2));
    
    // Aceitar formato camelCase (já validado pelo schema)
    const familyBonusAccepted = data.familyBonusAccepted ?? false;
    const familyProfile = data.familyProfile ?? 'individual';
    
    // Create driver - CADASTRO INICIAL (sem validações de aprovação)
    const driver = await prisma.drivers.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        password_hash: hashedPassword,
        status: 'pending',
        neighborhood_id: data.neighborhoodId,
        community_id: data.communityId || null,
        family_bonus_accepted: familyBonusAccepted,
        family_bonus_profile: familyProfile,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('[GOV] persisted family_bonus_accepted:', driver.family_bonus_accepted);
    console.log('[GOV] persisted family_bonus_profile:', driver.family_bonus_profile);

    res.status(201).json({ 
      success: true, 
      data: { 
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status
      }
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar motorista'
    });
  }
});

// POST /api/governance/guide - Create tourist guide
router.post('/guide', async (req, res) => {
  try {
    const data = guideCreateSchema.parse(req.body);
    
    // Check if email already exists
    const existingGuide = await prisma.tourist_guides.findUnique({ where: { email: data.email } });
    if (existingGuide) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email já cadastrado' 
      });
    }
    
    // Create guide with pending status (needs approval)
    const guide = await prisma.tourist_guides.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        community_id: data.communityId || 'default-community', // TODO: get from request
        status: 'pending', // Requires admin approval
        is_bilingual: data.isBilingual,
        languages: data.languages,
        also_driver: data.alsoDriver,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: { 
        id: guide.id,
        name: guide.name,
        email: guide.email,
        phone: guide.phone,
        status: guide.status
      }
    });
  } catch (error) {
    console.error('Error creating guide:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar guia turístico'
    });
  }
});

// Rating endpoints
router.post('/ratings', ratingController.createRating);
router.get('/ratings/driver/:driverId', ratingController.getRatingSummary);

// Admin geofence endpoints (compatibility)
router.get('/admin/communities/with-duplicates', async (req, res) => {
  try {
    const communities = await prisma.communities.findMany({
      select: {
        id: true,
        name: true,
        is_active: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: communities });
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar comunidades' });
  }
});


// Neighborhood geofence endpoint
router.get('/neighborhoods/:id/geofence', async (req, res) => {
  try {
    const { id } = req.params;

    const geofence = await prisma.neighborhood_geofences.findFirst({
      where: { neighborhood_id: id },
      select: {
        id: true,
        neighborhood_id: true,
        geofence_type: true,
        coordinates: true,
        source: true,
        source_url: true,
        area: true,
      },
    });

    // Se tem geofence oficial, retorna
    if (geofence) {
      return res.json({ success: true, data: geofence });
    }

    // Fallback: gerar círculo de 800m baseado no centro do bairro
    const neighborhood = await prisma.neighborhoods.findUnique({
      where: { id },
      select: { name: true, // city: true, // HOTFIX: prod DB sem coluna city, center_lat: true, center_lng: true }
    });

    if (!neighborhood || !neighborhood.center_lat || !neighborhood.center_lng) {
      return res.json({ success: true, data: null });
    }

    // Gerar círculo de 800m (aproximadamente 32 pontos)
    const RADIUS_METERS = 800;
    const EARTH_RADIUS = 6371000; // metros
    const lat = Number(neighborhood.center_lat);
    const lng = Number(neighborhood.center_lng);
    const points = 32;
    
    const circleCoordinates: number[][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * Math.PI / 180;
      const dx = RADIUS_METERS * Math.cos(angle);
      const dy = RADIUS_METERS * Math.sin(angle);
      
      const newLat = lat + (dy / EARTH_RADIUS) * (180 / Math.PI);
      const newLng = lng + (dx / EARTH_RADIUS) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
      
      circleCoordinates.push([newLng, newLat]);
    }

    const fallbackGeofence = {
      id: `fallback-${id}`,
      neighborhood_id: id,
      geofence_type: 'FALLBACK_RADIUS',
      coordinates: [circleCoordinates], // Polygon format
      source: 'Generated (800m radius)',
      source_url: null,
      area: Math.PI * Math.pow(RADIUS_METERS / 1000, 2), // km²
      isFallback: true
    };

    return res.json({ success: true, data: fallbackGeofence });
  } catch (error) {
    console.error('[governance] neighborhoods/:id/geofence error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar geofence' });
  }
});

export { router as governanceRoutes };
