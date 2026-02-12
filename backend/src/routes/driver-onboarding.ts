import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = Router();

const driverOnboardingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),
  communityId: z.string().optional(),
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.string().optional()
});

// POST /api/driver/onboarding - Cadastro público de motorista
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const data = driverOnboardingSchema.parse(req.body);

    // Verificar se email já existe
    const existing = await prisma.drivers.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Email já cadastrado'
      });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Criar motorista com status pending
    const driver = await prisma.drivers.create({
      data: {
        id: `driver-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password_hash: passwordHash,
        neighborhood_id: data.neighborhoodId,
        community_id: data.communityId || null,
        family_bonus_accepted: data.familyBonusAccepted || false,
        family_bonus_profile: data.familyProfile || null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      data: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        status: driver.status
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    console.error('Error in driver onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao realizar cadastro'
    });
  }
});

export default router;
