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
  communityId: z.string().uuid().optional().nullable(),
  lgpdAccepted: z.boolean().optional().default(true)
});

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().optional()
});

// POST /api/passenger/onboarding
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, neighborhoodId, communityId, lgpdAccepted } = registerSchema.parse(req.body);
    
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
        community_id: communityId || null,
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
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro ao finalizar cadastro'
    });
  }
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
