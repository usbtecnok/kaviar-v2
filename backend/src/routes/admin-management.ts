import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// Apply authentication to all admin management routes
router.use(authenticateAdmin);

// Dashboard Overview
router.get('/dashboard', async (req, res) => {
  try {
    const [
      driversCount,
      passengersCount,
      communitiesCount,
      guidesCount,
      pendingDrivers,
      pendingPassengers,
      pendingGuides,
      activeCommunities
    ] = await Promise.all([
      prisma.driver.count(),
      prisma.passenger.count(),
      prisma.community.count(),
      prisma.touristGuide.count(),
      prisma.driver.count({ where: { status: 'pending' } }),
      prisma.passenger.count({ where: { status: 'pending' } }),
      prisma.touristGuide.count({ where: { status: 'pending' } }),
      prisma.community.count({ where: { isActive: true } })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          drivers: driversCount,
          passengers: passengersCount,
          communities: communitiesCount,
          guides: guidesCount,
          activeCommunities
        },
        pending: {
          drivers: pendingDrivers,
          passengers: pendingPassengers,
          guides: pendingGuides
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Communities (Bairros) Management
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.community.findMany({
      include: {
        drivers: {
          select: {
            id: true,
            status: true,
            isPremium: true
          }
        },
        passengers: {
          select: {
            id: true,
            status: true
          }
        },
        guides: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const communitiesWithStats = communities.map(community => {
      const activeDrivers = community.drivers.filter(d => d.status === 'approved').length;
      const premiumDrivers = community.drivers.filter(d => d.status === 'approved' && d.isPremium).length;
      const activePassengers = community.passengers.filter(p => p.status === 'approved').length;
      const activeGuides = community.guides.filter(g => g.status === 'approved').length;
      
      const canActivate = activeDrivers >= community.minActiveDrivers;
      
      return {
        ...community,
        stats: {
          activeDrivers,
          premiumDrivers,
          activePassengers,
          activeGuides,
          canActivate,
          minRequired: community.minActiveDrivers
        }
      };
    });

    res.json({
      success: true,
      data: communitiesWithStats
    });
  } catch (error) {
    console.error('Communities list error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Create Community
router.post('/communities', async (req, res) => {
  try {
    const createSchema = z.object({
      name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      isActive: z.boolean().optional().default(true)
    });

    const { name, isActive } = createSchema.parse(req.body);

    // Check for duplicate (case-insensitive)
    const existing = await prisma.community.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bairro já existe'
      });
    }

    // Create community
    const community = await prisma.community.create({
      data: {
        name: name.trim(),
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      success: true,
      data: community
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Dados inválidos'
      });
    }

    console.error('Create community error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Toggle Community Status
router.patch('/communities/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    
    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        drivers: {
          where: { status: 'approved' },
          select: { id: true }
        }
      }
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Bairro não encontrado'
      });
    }

    const activeDrivers = community.drivers.length;
    
    // Se tentando ativar, verificar critério mínimo
    if (!community.isActive && activeDrivers < community.minActiveDrivers) {
      return res.status(400).json({
        success: false,
        error: `Não é possível ativar: mínimo de ${community.minActiveDrivers} motoristas ativos necessário. Atual: ${activeDrivers}`
      });
    }

    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: { 
        isActive: !community.isActive,
        lastEvaluatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedCommunity
    });
  } catch (error) {
    console.error('Toggle community error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Drivers Management
router.get('/drivers', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = status ? { status: status as string } : {};
    
    const drivers = await prisma.driver.findMany({
      where,
      include: {
        community: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Drivers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Approve/Reject Driver
router.patch('/drivers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = z.object({
      status: z.enum(['approved', 'rejected', 'suspended']),
      reason: z.string().optional()
    }).parse(req.body);

    const updateData: any = { status };
    
    if (status === 'suspended' && reason) {
      updateData.suspensionReason = reason;
      updateData.suspendedAt = new Date();
    }

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Driver status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Passengers Management
router.get('/passengers', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = status ? { status: status as string } : {};
    
    const passengers = await prisma.passenger.findMany({
      where,
      include: {
        community: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: passengers
    });
  } catch (error) {
    console.error('Passengers list error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Approve/Reject Passenger
router.patch('/passengers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['approved', 'rejected', 'suspended'])
    }).parse(req.body);

    const passenger = await prisma.passenger.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      data: passenger
    });
  } catch (error) {
    console.error('Passenger status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Tourist Guides Management
router.get('/guides', async (req, res) => {
  try {
    const { status } = req.query;
    
    const where = status ? { status: status as string } : {};
    
    const guides = await prisma.touristGuide.findMany({
      where,
      include: {
        community: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: guides
    });
  } catch (error) {
    console.error('Guides list error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Approve/Reject Guide
router.patch('/guides/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['approved', 'rejected', 'suspended'])
    }).parse(req.body);

    const guide = await prisma.touristGuide.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      data: guide
    });
  } catch (error) {
    console.error('Guide status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export { router as adminManagementRoutes };
