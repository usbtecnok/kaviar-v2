import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { elderlyAdminRateLimit } from '../middlewares/auth-rate-limit';
import { authenticateAdmin } from '../middlewares/auth';
import { createAuditLog } from '../utils/audit';

const router = Router();

// Apply authentication and rate limiting to all elderly routes
router.use(authenticateAdmin);
router.use(elderlyAdminRateLimit);

// Validation schemas
const contractsQuerySchema = z.object({
  communityId: z.string().cuid().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED']).optional(),
  serviceType: z.string().optional(),
  activeOnly: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => Math.max(1, parseInt(val) || 1)).optional().default('1'),
  pageSize: z.string().transform(val => Math.min(100, Math.max(1, parseInt(val) || 10))).optional().default('10')
});

const createContractSchema = z.object({
  passengerId: z.string().cuid('ID do passageiro inválido'),
  responsibleId: z.string().cuid('ID do responsável inválido').optional(),
  communityId: z.string().cuid('ID do bairro inválido'),
  serviceType: z.string().default('ACOMPANHAMENTO_ATIVO'),
  startsAt: z.string().datetime('Data de início inválida'),
  endsAt: z.string().datetime('Data de fim inválida').optional(),
  notes: z.string().max(500, 'Notas muito longas').optional(),
  elderlyProfile: z.object({
    emergencyContact: z.string().max(100).optional(),
    emergencyPhone: z.string().max(20).optional(),
    medicalNotes: z.string().max(1000).optional(),
    careLevel: z.enum(['basic', 'intensive', 'medical']).default('basic')
  }).optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status deve ser ACTIVE, INACTIVE ou CANCELLED' })
  }),
  reason: z.string().max(200, 'Motivo muito longo').optional()
});

// GET /api/admin/elderly/contracts
router.get('/contracts', async (req, res) => {
  try {
    const query = contractsQuerySchema.parse(req.query);
    
    const where: any = {};
    
    if (query.communityId) {
      where.communityId = query.communityId;
    }
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }
    
    if (query.activeOnly) {
      where.status = 'ACTIVE';
    }

    const skip = (query.page - 1) * query.pageSize;
    
    const [contracts, total] = await Promise.all([
      prisma.elderlyContract.findMany({
        where,
        skip,
        take: query.pageSize,
        include: {
          elderlyProfile: {
            include: {
              passenger: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                  // Não incluir dados sensíveis por padrão
                }
              }
            }
          },
          responsible: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          community: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.elderlyContract.count({ where })
    ]);

    // Sanitizar dados sensíveis para listagem
    const sanitizedContracts = contracts.map(contract => ({
      ...contract,
      elderlyProfile: {
        ...contract.elderlyProfile,
        // Remover dados médicos sensíveis da listagem
        medicalNotes: contract.elderlyProfile.medicalNotes ? '[CONFIDENCIAL]' : null,
        emergencyContact: contract.elderlyProfile.emergencyContact ? '[CONFIDENCIAL]' : null,
        emergencyPhone: contract.elderlyProfile.emergencyPhone ? '[CONFIDENCIAL]' : null
      }
    }));

    res.json({
      success: true,
      data: {
        contracts: sanitizedContracts,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize)
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Elderly contracts list error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/admin/elderly/contracts
router.post('/contracts', async (req, res) => {
  try {
    const data = createContractSchema.parse(req.body);
    const adminId = (req as any).admin?.id;

    // Validar se passenger existe
    const passenger = await prisma.passenger.findUnique({
      where: { id: data.passengerId }
    });

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: 'Passageiro não encontrado'
      });
    }

    // Validar se community existe
    const community = await prisma.community.findUnique({
      where: { id: data.communityId }
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Bairro não encontrado'
      });
    }

    // Validar responsible se fornecido
    if (data.responsibleId) {
      const responsible = await prisma.passenger.findUnique({
        where: { id: data.responsibleId }
      });

      if (!responsible) {
        return res.status(404).json({
          success: false,
          error: 'Responsável não encontrado'
        });
      }
    }

    // Verificar se já existe perfil elderly para este passenger
    let elderlyProfile = await prisma.elderlyProfile.findUnique({
      where: { passengerId: data.passengerId }
    });

    // Criar perfil se não existir
    if (!elderlyProfile && data.elderlyProfile) {
      elderlyProfile = await prisma.elderlyProfile.create({
        data: {
          passengerId: data.passengerId,
          ...data.elderlyProfile
        }
      });
    }

    if (!elderlyProfile) {
      return res.status(400).json({
        success: false,
        error: 'Perfil de idoso é obrigatório para criar contrato'
      });
    }

    // Criar contrato
    const contract = await prisma.elderlyContract.create({
      data: {
        elderlyProfileId: elderlyProfile.id,
        responsibleId: data.responsibleId,
        communityId: data.communityId,
        serviceType: data.serviceType,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        notes: data.notes
      },
      include: {
        elderlyProfile: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Auditoria
    await createAuditLog({
      adminId,
      action: 'ELDERLY_CONTRACT_CREATED',
      entityType: 'elderly_contract',
      entityId: contract.id,
      newValue: { status: contract.status, serviceType: contract.serviceType },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: contract
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Elderly contract creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PATCH /api/admin/elderly/contracts/:id/status
router.patch('/contracts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = updateStatusSchema.parse(req.body);
    const adminId = (req as any).admin?.id;

    // Buscar contrato atual
    const currentContract = await prisma.elderlyContract.findUnique({
      where: { id },
      include: {
        elderlyProfile: {
          include: {
            passenger: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!currentContract) {
      return res.status(404).json({
        success: false,
        error: 'Contrato não encontrado'
      });
    }

    const oldStatus = currentContract.status;

    // Atualizar status
    const updatedContract = await prisma.elderlyContract.update({
      where: { id },
      data: { 
        status,
        notes: reason ? `${currentContract.notes || ''}\n[${new Date().toISOString()}] Status alterado para ${status}: ${reason}`.trim() : currentContract.notes
      },
      include: {
        elderlyProfile: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        community: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Auditoria
    await createAuditLog({
      adminId,
      action: 'ELDERLY_CONTRACT_STATUS_CHANGED',
      entityType: 'elderly_contract',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status },
      reason,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: updatedContract
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Elderly contract status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/admin/elderly/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Contadores globais
    const [totalContracts, activeContracts, inactiveContracts, cancelledContracts] = await Promise.all([
      prisma.elderlyContract.count(),
      prisma.elderlyContract.count({ where: { status: 'ACTIVE' } }),
      prisma.elderlyContract.count({ where: { status: 'INACTIVE' } }),
      prisma.elderlyContract.count({ where: { status: 'CANCELLED' } })
    ]);

    // Contadores por bairro
    const contractsByCommunity = await prisma.elderlyContract.groupBy({
      by: ['communityId', 'status'],
      _count: {
        id: true
      },
      orderBy: {
        communityId: 'asc'
      }
    });

    // Buscar nomes dos bairros
    const communityIds = [...new Set(contractsByCommunity.map(item => item.communityId))];
    const communities = await prisma.community.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, name: true }
    });

    // Organizar dados por bairro
    const communitiesMap = communities.reduce((acc, community) => {
      acc[community.id] = {
        id: community.id,
        name: community.name,
        active: 0,
        inactive: 0,
        cancelled: 0,
        total: 0
      };
      return acc;
    }, {} as any);

    contractsByCommunity.forEach(item => {
      if (communitiesMap[item.communityId]) {
        const status = item.status.toLowerCase();
        communitiesMap[item.communityId][status] = item._count.id;
        communitiesMap[item.communityId].total += item._count.id;
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          total: totalContracts,
          active: activeContracts,
          inactive: inactiveContracts,
          cancelled: cancelledContracts
        },
        byCommunity: Object.values(communitiesMap)
      }
    });
  } catch (error) {
    console.error('Elderly dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export { router as elderlyRoutes };
