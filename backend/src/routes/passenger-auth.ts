import { Router } from 'express';
import { prisma } from '../config/database';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const passengerLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
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

    // Check if passenger is active (no approval needed for passengers)
    if (passenger.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        error: 'Conta não está ativa'
      });
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
