import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';
import { resolveTerritory } from '../services/territory-resolver.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  neighborhoodId: z.string().uuid('Bairro inválido'),
  communityId: z.string().optional().nullable(), // Aceita UUID ou slug
  lgpdAccepted: z.boolean().optional().default(true)
});

// Helper: resolver communityId (UUID ou slug) para UUID
async function resolveCommunityId(input: string | null | undefined): Promise<string | null> {
  if (!input) return null;
  
  // Se já é UUID, retorna direto
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input;
  
  // Caso contrário, tenta resolver por nome
  const community = await prisma.communities.findFirst({
    where: { name: { equals: input, mode: 'insensitive' } },
    select: { id: true }
  });
  
  return community?.id || null;
}

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().optional()
});

// POST /api/passenger/onboarding
router.post('/', async (req, res) => {
  try {
    console.log('[passenger/onboarding] Received payload:', JSON.stringify(req.body, null, 2));
    const { name, email, password, phone, neighborhoodId, communityId: communityInput, lgpdAccepted } = registerSchema.parse(req.body);
    
    // Resolver communityId (UUID ou slug)
    const communityId = await resolveCommunityId(communityInput);
    
    const existingPassenger = await prisma.passengers.findUnique({
      where: { email }
    });

    if (existingPassenger) {
      return res.status(409).json({
        success: false,
        error: 'Email já cadastrado'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const passenger = await prisma.passengers.create({
      data: {
        id: `pass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        password_hash,
        phone,
        neighborhood_id: neighborhoodId,
        community_id: communityId,
        status: 'ACTIVE',
        updated_at: new Date()
      }
    });

    if (lgpdAccepted) {
      await prisma.user_consents.upsert({
        where: {
          passenger_id_consent_type: {
            passenger_id: passenger.id,
            consent_type: 'LGPD'
          }
        },
        create: {
          id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          passenger_id: passenger.id,
          consent_type: 'LGPD',
          accepted: true,
          accepted_at: new Date(),
          created_at: new Date()
        },
        update: {
          accepted: true,
          accepted_at: new Date()
        }
      });
    }

    const token = jwt.sign(
      { 
        userId: passenger.id, 
        userType: 'PASSENGER',
        email: passenger.email 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        id: passenger.id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone
      },
      token
    });
  } catch (error) {
    console.error('[passenger/onboarding] Error:', error);
    
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      console.error('[passenger/onboarding] Validation errors:', JSON.stringify(issues, null, 2));
      return res.status(400).json({
        success: false,
        error: error.errors[0].message,
        issues
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao finalizar cadastro'
    });
  }
});

// Helper: criar geofence circular para comunidade (se não existir)
async function ensureCommunityGeofence(communityId: string, lat: number, lng: number, radiusMeters: number = 500) {
  try {
    // Verificar se já existe
    const existing = await prisma.community_geofences.findFirst({
      where: { community_id: communityId }
    });
    if (existing) return;

    // Gerar círculo
    const EARTH_R = 6371000;
    const coords: number[][] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i * 360 / 32) * Math.PI / 180;
      const dx = radiusMeters * Math.cos(angle);
      const dy = radiusMeters * Math.sin(angle);
      const newLat = lat + (dy / EARTH_R) * (180 / Math.PI);
      const newLng = lng + (dx / EARTH_R) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
      coords.push([newLng, newLat]);
    }

    // Criar geofence
    await prisma.community_geofences.create({
      data: {
        id: `geofence-${communityId}-${Date.now()}`,
        community_id: communityId,
        center_lat: lat,
        center_lng: lng,
        geojson: JSON.stringify({ type: 'Polygon', coordinates: [coords] }),
        source: `Generated from first resident GPS (${radiusMeters}m)`,
        confidence: 'generated',
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log(`[geofence] Created circular geofence for community ${communityId} (${radiusMeters}m)`);
  } catch (error) {
    console.error('[geofence] Error creating community geofence:', error);
  }
}

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

      // Criar geofence circular para comunidade (se não existir)
      if (territory.community?.id) {
        await ensureCommunityGeofence(territory.community.id, lat, lng, 500);
      }
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
