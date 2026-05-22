import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/my-operator-profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin.id;
    const profile = await prisma.operator_profiles.findUnique({
      where: { admin_id: adminId },
      include: { territory: { select: { id: true, name: true, level: true } } },
    });
    if (!profile) return res.json({ success: true, data: null });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar perfil' });
  }
});

export default router;
