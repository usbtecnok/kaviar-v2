import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { config } from '../config';
import { loginRateLimit, registrationRateLimit } from '../middlewares/auth-rate-limit';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Helper function to generate JWT
const generateToken = (userId: string, userType: 'driver' | 'passenger') => {
  return jwt.sign(
    { userId, userType },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

// Driver Registration
router.post('/driver/register', registrationRateLimit, async (req, res) => {
  try {
    const { name, email, password, phone } = registerSchema.parse(req.body);

    // Check if driver already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { email }
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        error: 'Email já está em uso'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create driver
    const driver = await prisma.driver.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        status: 'pending'
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    });

    // Generate token
    const token = generateToken(driver.id, 'driver');

    res.status(201).json({
      success: true,
      data: {
        driver,
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Driver registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Driver Login
router.post('/driver/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find driver
    const driver = await prisma.driver.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        status: true
      }
    });

    // Generic error message for security
    const invalidCredentials = {
      success: false,
      error: 'Credenciais inválidas'
    };

    // Check if driver exists and has password
    if (!driver || !driver.passwordHash) {
      return res.status(401).json(invalidCredentials);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, driver.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json(invalidCredentials);
    }

    // Check if driver is active
    if (driver.status === 'suspended' || driver.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Conta suspensa ou rejeitada'
      });
    }

    // Generate token
    const token = generateToken(driver.id, 'driver');

    res.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          name: driver.name,
          email: driver.email,
          status: driver.status
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Passenger Registration
router.post('/passenger/register', registrationRateLimit, async (req, res) => {
  try {
    const { name, email, password, phone } = registerSchema.parse(req.body);

    // Check if passenger already exists
    const existingPassenger = await prisma.passenger.findUnique({
      where: { email }
    });

    if (existingPassenger) {
      return res.status(400).json({
        success: false,
        error: 'Email já está em uso'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create passenger
    const passenger = await prisma.passenger.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        status: 'pending'
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true
      }
    });

    // Generate token
    const token = generateToken(passenger.id, 'passenger');

    res.status(201).json({
      success: true,
      data: {
        passenger,
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Passenger registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Passenger Login
router.post('/passenger/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find passenger
    const passenger = await prisma.passenger.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        status: true
      }
    });

    // Generic error message for security
    const invalidCredentials = {
      success: false,
      error: 'Credenciais inválidas'
    };

    // Check if passenger exists and has password
    if (!passenger || !passenger.passwordHash) {
      return res.status(401).json(invalidCredentials);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, passenger.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json(invalidCredentials);
    }

    // Check if passenger is active
    if (passenger.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Conta suspensa'
      });
    }

    // Generate token
    const token = generateToken(passenger.id, 'passenger');

    res.json({
      success: true,
      data: {
        passenger: {
          id: passenger.id,
          name: passenger.name,
          email: passenger.email,
          status: passenger.status
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Passenger login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export { router as userAuthRoutes };
