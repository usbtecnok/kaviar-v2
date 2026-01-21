import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { authenticateAdmin } from '../middlewares/auth';
import { ApprovalController } from '../modules/admin/approval-controller';

const router = Router();
const approvalController = new ApprovalController();

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
          pix_key_type: true,
          neighborhood_id: true,
          vehicle_color: true,
          vehicle_model: true,
          vehicle_plate: true,
          family_bonus_accepted: true,
          family_bonus_profile: true,
          neighborhoods: {
            select: {
              name: true
            }
          }
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

    // Buscar por id, email ou phone (robustez máxima)
    const driver = await prisma.drivers.findFirst({
      where: {
        OR: [
          { id },
          { email: id },
          { phone: id }
        ]
      },
      include: {
        driver_consents: true,
        neighborhoods: {
          select: {
            id: true,
            name: true
          }
        },
        communities: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!driver) {
      console.error(`[Admin] Driver not found with param: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    // Log qual campo casou
    let matchedBy = 'id';
    if (driver.email === id) matchedBy = 'email';
    else if (driver.phone === id) matchedBy = 'phone';
    console.log(`[Admin] Driver found by ${matchedBy}: ${driver.id}`);

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

// GET /api/admin/drivers/:id/documents
router.get('/drivers/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documents = await prisma.driver_documents.findMany({
      where: { driver_id: id },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error getting driver documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar documentos'
    });
  }
});

// POST/PUT /api/admin/drivers/:id/approve (delegado ao ApprovalController)
// Aceita ambos métodos para compatibilidade frontend
router.post('/drivers/:id/approve', approvalController.approveDriver);
router.put('/drivers/:id/approve', approvalController.approveDriver);

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

// 🔍 DEBUG ENDPOINT (ADMIN ONLY, ENV GATED)
// GET /api/admin/debug/uploads-check?file=<filename>
router.get('/debug/uploads-check', async (req: Request, res: Response) => {
  // Feature flag: só habilitar em produção com env var
  if (process.env.ENABLE_UPLOADS_DEBUG !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { file } = req.query;
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const uploadDir = path.join(process.cwd(), 'uploads', 'certidoes');
  
  const result = {
    cwd: process.cwd(),
    uploadsDir,
    uploadDir,
    uploadsDirExists: fs.existsSync(uploadsDir),
    uploadDirExists: fs.existsSync(uploadDir),
    fileExists: null as boolean | null,
    filePath: null as string | null,
    uploadsDirContents: [] as string[],
    uploadDirContents: [] as string[]
  };

  // Listar conteúdo dos diretórios
  if (result.uploadsDirExists) {
    try {
      result.uploadsDirContents = fs.readdirSync(uploadsDir);
    } catch (e) {
      result.uploadsDirContents = [`Error: ${e}`];
    }
  }

  if (result.uploadDirExists) {
    try {
      result.uploadDirContents = fs.readdirSync(uploadDir);
    } catch (e) {
      result.uploadDirContents = [`Error: ${e}`];
    }
  }

  // Verificar arquivo específico
  if (file && typeof file === 'string') {
    result.filePath = path.join(uploadDir, file);
    result.fileExists = fs.existsSync(result.filePath);
  }

  res.json(result);
});

export default router;
