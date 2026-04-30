import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin } from '../middlewares/auth';
import { auditWrite } from '../middlewares/audit-write';

const router = Router();
router.use(authenticateAdmin);

/** Se ends_at é só data (YYYY-MM-DD), ajusta para 23:59:59 Brasília (UTC-3 = 02:59:59 UTC do dia seguinte) */
function parseEndsAt(v: string | null | undefined): Date | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + 'T23:59:59-03:00');
  }
  return new Date(v);
}

// GET /api/admin/showcase
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, community_id, neighborhood_id } = req.query;
    const where: any = {};
    if (status === 'active') where.is_active = true;
    if (status === 'inactive') where.is_active = false;
    if (type) where.type = type;
    if (community_id) where.community_id = community_id;
    if (neighborhood_id) where.neighborhood_id = neighborhood_id;

    const items = await prisma.showcase_items.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/showcase/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.showcase_items.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/showcase
router.post('/', auditWrite('create_showcase_item', 'showcase_item'), async (req: Request, res: Response) => {
  try {
    const { title, description, icon, type, community_id, neighborhood_id, cta_label, cta_url, is_active, priority, starts_at, ends_at, exposure_quota } = req.body;
    if (!title || !description || !cta_label || !cta_url) {
      return res.status(400).json({ success: false, error: 'title, description, cta_label e cta_url são obrigatórios' });
    }
    const adminId = (req as any).adminId;
    const item = await prisma.showcase_items.create({
      data: {
        title, description, icon: icon || '🏪', type: type || 'commerce',
        community_id: community_id || null, neighborhood_id: neighborhood_id || null,
        cta_label, cta_url, is_active: is_active || false, priority: priority || 0,
        exposure_quota: exposure_quota != null ? Number(exposure_quota) : null,
        starts_at: starts_at ? new Date(starts_at) : null, ends_at: parseEndsAt(ends_at),
        created_by: adminId,
      },
    });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/showcase/:id
router.put('/:id', auditWrite('update_showcase_item', 'showcase_item'), async (req: Request, res: Response) => {
  try {
    const { title, description, icon, type, community_id, neighborhood_id, cta_label, cta_url, is_active, priority, starts_at, ends_at, exposure_quota } = req.body;
    const item = await prisma.showcase_items.update({
      where: { id: req.params.id },
      data: {
        title, description, icon, type,
        community_id: community_id || null, neighborhood_id: neighborhood_id || null,
        cta_label, cta_url, is_active, priority: priority || 0,
        exposure_quota: exposure_quota != null ? Number(exposure_quota) : null,
        starts_at: starts_at ? new Date(starts_at) : null, ends_at: parseEndsAt(ends_at),
      },
    });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/showcase/:id — ativar/desativar/aprovar
router.patch('/:id', auditWrite('patch_showcase_item', 'showcase_item'), async (req: Request, res: Response) => {
  try {
    const { is_active, approved } = req.body;
    const data: any = {};
    if (typeof is_active === 'boolean') data.is_active = is_active;
    if (approved) { data.approved_at = new Date(); data.approved_by = (req as any).adminId; }
    const item = await prisma.showcase_items.update({ where: { id: req.params.id }, data });
    return res.json({ success: true, data: item });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
