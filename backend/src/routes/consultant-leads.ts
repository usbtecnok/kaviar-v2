import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Resolver região pelo DDD do telefone
function resolveRegion(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Remove country code 55 se presente
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  const ddd = local.slice(0, 2);

  const dddToRegion: Record<string, string> = {
    '21': 'RJ', '22': 'RJ', '24': 'RJ',
    '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
    '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
  };

  return dddToRegion[ddd] || 'OTHER';
}

// Round-robin: próximo funcionário da região
async function autoAssign(region: string): Promise<string | null> {
  const staff = await prisma.admins.findMany({
    where: { is_active: true, lead_regions: { contains: region } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (staff.length === 0) return null;

  // Contar leads atribuídos a cada funcionário (o que tem menos recebe)
  const counts = await prisma.consultant_leads.groupBy({
    by: ['assigned_to'],
    where: { assigned_to: { in: staff.map(s => s.id) } },
    _count: true,
  });

  const countMap = new Map(counts.map(c => [c.assigned_to, c._count]));
  let min = Infinity;
  let pick = staff[0].id;
  for (const s of staff) {
    const n = countMap.get(s.id) || 0;
    if (n < min) { min = n; pick = s.id; }
  }

  return pick;
}

// POST /api/public/consultant-lead — sem auth (chamado pelo fluxo WhatsApp)
router.post('/consultant-lead', async (req: Request, res: Response) => {
  try {
    const { name, phone, source, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'name e phone obrigatórios' });
    }

    const existing = await prisma.consultant_leads.findFirst({
      where: { phone, status: { not: 'dismissed' } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Este contato já foi indicado' });
    }

    const region = resolveRegion(phone);
    const assignedTo = await autoAssign(region);

    const lead = await prisma.consultant_leads.create({
      data: {
        name,
        phone,
        source: source || 'whatsapp',
        notes,
        region,
        assigned_to: assignedTo,
        assigned_at: assignedTo ? new Date() : null,
      },
    });

    console.log(`[LEAD_CREATED] id=${lead.id} region=${region} assigned_to=${assignedTo || 'UNASSIGNED'}`);

    return res.json({ success: true, data: lead });
  } catch (err) {
    console.error('[CONSULTANT_LEADS] create error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao registrar lead' });
  }
});

// GET /api/admin/consultant-leads — admin only
router.get('/consultant-leads', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const leads = await prisma.consultant_leads.findMany({
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: leads });
  } catch (err) {
    console.error('[CONSULTANT_LEADS] list error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar leads' });
  }
});

// PATCH /api/admin/consultant-leads/:id — atualizar status/notes/assigned_to
router.patch('/consultant-leads/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, notes, assigned_to } = req.body;

    const data: any = {};
    if (status) {
      data.status = status;
      if (status === 'contacted') data.last_contact_at = new Date();
    }
    if (notes !== undefined) data.notes = notes;
    if (assigned_to !== undefined) {
      data.assigned_to = assigned_to;
      data.assigned_at = assigned_to ? new Date() : null;
    }

    const lead = await prisma.consultant_leads.update({
      where: { id: req.params.id },
      data,
    });

    if (assigned_to !== undefined) {
      console.log(`[LEAD_REASSIGNED] id=${lead.id} assigned_to=${assigned_to || 'UNASSIGNED'}`);
    }

    return res.json({ success: true, data: lead });
  } catch (err) {
    console.error('[CONSULTANT_LEADS] update error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar lead' });
  }
});

export default router;
