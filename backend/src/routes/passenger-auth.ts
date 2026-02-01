import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const passengerLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const passengerRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido')
});

// POST /api/auth/passenger/register
router.post('/passenger/register', async (req, res) => {
  try {
    const { name, email, password, phone } = passengerRegisterSchema.parse(req.body);
    
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
        status: 'ACTIVE',
        updated_at: new Date()
      }
    });

    // Generate JWT token
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
      process.env.JWT_SECRET || 'fallback-secret',
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

export { router as passengerAuthRoutes };
