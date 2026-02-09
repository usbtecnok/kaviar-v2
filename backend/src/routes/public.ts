import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/public/neighborhoods - Public endpoint (no auth)
router.get('/neighborhoods', async (req, res) => {
  try {
    const { city } = req.query;
    
    const where: any = { is_active: true };
    if (city) where.city = city;
    
    const neighborhoods = await prisma.neighborhoods.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: neighborhoods });
  } catch (error) {
    console.error('[public] neighborhoods error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar bairros' });
  }
});

// GET /api/public/communities - Public endpoint (no auth)
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.communities.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: communities });
  } catch (error) {
    console.error('[public] communities error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar comunidades' });
  }
});

export { router as publicRoutes };
