import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { z } from 'zod';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// Aplicar autenticação admin em todas as rotas
router.use(authenticateAdmin);

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

// GET /api/admin/drivers?status=pending
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [drivers, total] = await Promise.all([
      prisma.drivers.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          created_at: true,
          certidao_nada_consta_url: true,
          pix_key: true,
          pix_key_type: true
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip
      }),
      prisma.drivers.count({ where })
    ]);

    res.json({
      success: true,
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing drivers:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar motoristas'
    });
  }
});

// GET /api/admin/drivers/:id
router.get('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const driver = await prisma.drivers.findUnique({
      where: { id },
      include: {
        driver_consents: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error getting driver:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar motorista'
    });
  }
});

// POST /api/admin/drivers/:id/approve
router.post('/drivers/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).userId; // ID do admin autenticado

    const driver = await prisma.drivers.findUnique({ where: { id } });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    if (driver.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Motorista já está aprovado'
      });
    }

    await prisma.drivers.update({
      where: { id },
      data: {
        status: 'approved',
        approved_at: new Date(),
        approved_by: adminId,
        rejected_at: null,
        rejected_by: null,
        rejected_reason: null,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Motorista aprovado com sucesso'
    });
  } catch (error) {
    console.error('Error approving driver:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao aprovar motorista'
    });
  }
});

// POST /api/admin/drivers/:id/reject
router.post('/drivers/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).userId;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Motivo da rejeição é obrigatório'
      });
    }

    const driver = await prisma.drivers.findUnique({ where: { id } });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    await prisma.drivers.update({
      where: { id },
      data: {
        status: 'rejected',
        rejected_at: new Date(),
        rejected_by: adminId,
        rejected_reason: reason,
        approved_at: null,
        approved_by: null,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Motorista rejeitado'
    });
  } catch (error) {
    console.error('Error rejecting driver:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao rejeitar motorista'
    });
  }
});

export default router;
