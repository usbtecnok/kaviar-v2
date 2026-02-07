import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const guideLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

// POST /api/auth/guide/login
router.post('/guide/login', async (req, res) => {
  try {
    const { email, password } = guideLoginSchema.parse(req.body);
    
    // Find guide by email
    const guide = await prisma.tourist_guides.findUnique({
      where: { email }
    });

    if (!guide) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    // Check if guide is approved (needs admin approval)
    if (guide.status !== 'approved') {
      return res.status(401).json({
        success: false,
        error: 'Conta aguardando aprovação do administrador'
      });
    }

    // Note: Tourist guides don't have password_hash in schema yet
    // For now, we'll create a temporary password system
    // TODO: Add password_hash field to tourist_guides table
    const tempPassword = 'guide123'; // Temporary for testing
    const isValidPassword = password === tempPassword;
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email ou senha incorretos'
      });
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET não configurado' });
    }

    const token = jwt.sign(
      { 
        userId: guide.id, 
        userType: 'GUIDE',
        email: guide.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: guide.id,
        name: guide.name,
        email: guide.email,
        phone: guide.phone,
        user_type: 'GUIDE',
        is_bilingual: guide.is_bilingual,
        languages: guide.languages,
        also_driver: guide.also_driver
      }
    });
  } catch (error) {
    console.error('Error in guide login:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no login'
    });
  }
});

export { router as guideAuthRoutes };
