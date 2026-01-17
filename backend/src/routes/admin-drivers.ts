import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();

// TODO: Adicionar middleware de autenticação admin
// router.use(authenticateAdmin);

const createDriverSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional()
});

// POST /api/admin/drivers/create
// TODO: Adicionar autenticação admin
router.post('/drivers/create', async (req: Request, res: Response) => {
  try {
    const data = createDriverSchema.parse(req.body);

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

    // Criar motorista
    const driver = await prisma.drivers.create({
      data: {
        id: `driver-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Motorista criado com sucesso',
      data: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        status: driver.status,
        first_access_link: `/motorista/definir-senha?email=${encodeURIComponent(driver.email)}`
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    console.error('Error creating driver:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar motorista'
    });
  }
});

export default router;
