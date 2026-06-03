import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/my-operator-profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    let profile = await prisma.operator_profiles.findUnique({
      where: { admin_id: admin.id },
      include: { territory: { select: { id: true, name: true, level: true } } },
    });

    // On-demand: criar profile se TERRITORIAL_OPERATOR com territory_access
    if (!profile && admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER') {
      const access = await prisma.admin_territory_access.findFirst({ where: { admin_id: admin.id } });
      if (access) {
        profile = await prisma.operator_profiles.create({
          data: {
            admin_id: admin.id,
            territory_id: access.territory_id,
            display_name: admin.name || 'Operador Territorial',
            relationship_type: 'territorial_operator',
            recipient_type: 'individual',
            contract_status: 'pending',
            document_status: 'pending',
            is_active: false,
          },
          include: { territory: { select: { id: true, name: true, level: true } } },
        });
      }
    }

    if (!profile) return res.json({ success: true, data: null });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar perfil' });
  }
});

// POST /api/admin/my-operator-profile/accept-terms
router.post('/accept-terms', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({ where: { admin_id: admin.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    if (profile.terms_accepted_at) {
      return res.json({ success: true, data: { already_accepted: true, accepted_at: profile.terms_accepted_at } });
    }

    const now = new Date();
    const updated = await prisma.operator_profiles.update({
      where: { admin_id: admin.id },
      data: {
        terms_accepted_at: now,
        responsibility_terms_accepted_at: now,
        confidentiality_terms_accepted_at: now,
        terms_version: 'v1.0-captador',
        terms_accepted_by: admin.id,
        contract_status: 'signed',
      },
    });

    res.json({ success: true, data: { accepted_at: updated.terms_accepted_at, terms_version: updated.terms_version } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao aceitar termos' });
  }
});

export default router;
