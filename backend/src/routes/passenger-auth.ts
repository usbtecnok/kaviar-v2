import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

import { GeoResolveService } from '../services/geo-resolve';

const router = Router();
const geoResolveService = new GeoResolveService();

const passengerLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const passengerRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  lat: z.number({ required_error: 'Localização obrigatória' }),
  lng: z.number({ required_error: 'Localização obrigatória' }),
  lgpdAccepted: z.boolean().optional().default(true)
});

// POST /api/auth/passenger/register
router.post('/passenger/register', async (req, res) => {
  try {
    const { name, email, password, phone, lat, lng, lgpdAccepted } = passengerRegisterSchema.parse(req.body);
    
    // Check if email already exists
    const existingPassenger = await prisma.passengers.findUnique({
      where: { email }
    });

    if (existingPassenger) {
      return res.status(409).json({
        success: false,
        error: 'Email já cadastrado'
      });
    }

    // Resolve territory from GPS
    let neighborhoodId: string | null = null;
    let territoryName: string | null = null;
    try {
      const geoResult = await geoResolveService.resolveCoordinates(lat, lng);
      if (geoResult.match && geoResult.resolvedArea) {
        neighborhoodId = geoResult.resolvedArea.id;
        territoryName = geoResult.resolvedArea.name;
      }
    } catch (geoErr) {
      console.error('[PASSENGER_REGISTER] geo-resolve failed, continuing without territory:', geoErr);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create passenger
    const passenger = await prisma.passengers.create({
      data: {
        id: `pass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        password_hash,
        phone,
        neighborhood_id: neighborhoodId,
        last_lat: lat,
        last_lng: lng,
        last_location_updated_at: new Date(),
        status: 'ACTIVE',
        updated_at: new Date()
      }
    });

    console.log(`[PASSENGER_REGISTERED] id=${passenger.id} email=${email} neighborhood_id=${neighborhoodId || 'null'} territory=${territoryName || 'none'}`);

    // Create LGPD consent if accepted
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: passenger.id, 
        userType: 'PASSENGER',
        email: passenger.email 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: passenger.id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
        user_type: 'PASSENGER'
      }
    });
  } catch (error) {
    console.error('Error in passenger register:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no cadastro'
    });
  }
});

// POST /api/auth/passenger/login
router.post('/passenger/login', async (req, res) => {
  try {
    const { email, password } = passengerLoginSchema.parse(req.body);
    
    // Find passenger by email
    const passenger = await prisma.passengers.findUnique({
      where: { email }
    });

    if (!passenger) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    // Check if passenger is active
    if (passenger.status !== 'ACTIVE' && passenger.status !== 'approved') {
      return res.status(401).json({
        success: false,
        error: 'Conta não está ativa'
      });
    }

    // LGPD consent check (skip for beta test accounts)
    if (!passenger.id.includes('beta')) {
      const lgpdConsent = await prisma.user_consents.findUnique({
        where: {
          passenger_id_consent_type: {
            passenger_id: passenger.id,
            consent_type: 'LGPD'
          }
        }
      });

      if (!lgpdConsent || !lgpdConsent.accepted) {
        return res.status(401).json({
          success: false,
          error: 'É necessário aceitar os termos LGPD para continuar'
        });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, passenger.password_hash || '');
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: passenger.id, 
        userType: 'PASSENGER',
        email: passenger.email 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: passenger.id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
        user_type: 'PASSENGER'
      }
    });
  } catch (error) {
    console.error('Error in passenger login:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no login'
    });
  }
});

// POST /api/auth/passenger/set-password
const passengerSetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

router.post('/passenger/set-password', async (req, res) => {
  try {
    const { email, password } = passengerSetPasswordSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const passenger = await prisma.passengers.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Email não encontrado. Verifique o email digitado.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.passengers.update({ where: { id: passenger.id }, data: { password_hash } });
    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: 'Erro ao atualizar senha' });
  }
});

export { router as passengerAuthRoutes };
