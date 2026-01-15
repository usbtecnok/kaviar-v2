import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateAdmin);

// GET /api/admin/passengers
router.get('/passengers', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [passengers, total] = await Promise.all([
      prisma.passengers.findMany({
        take: limit,
        skip,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          created_at: true
        }
      }),
      prisma.passengers.count()
    ]);

    res.json({
      success: true,
      data: passengers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar passageiros'
    });
  }
});

// GET /api/admin/rides
router.get('/rides', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      prisma.rides.findMany({
        take: limit,
        skip
      }),
      prisma.rides.count()
    ]);

    res.json({
      success: true,
      data: rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Rides error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar corridas'
    });
  }
});

// GET /api/admin/rides/:id
router.get('/rides/:id', async (req, res) => {
  try {
    const ride = await prisma.rides.findUnique({
      where: { id: req.params.id },
      include: {
        passengers: { select: { name: true, email: true, phone: true } },
        drivers: { select: { name: true, email: true, phone: true } }
      }
    });

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Corrida não encontrada'
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar corrida'
    });
  }
});

export { router as adminRoutes };
