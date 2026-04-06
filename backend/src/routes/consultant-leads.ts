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

// GET /api/admin/consultant-leads/performance — funil por funcionário
router.get('/consultant-leads/performance', requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Todos os leads (exceto dismissed)
    const leads = await prisma.consultant_leads.findMany({
      where: { status: { not: 'dismissed' } },
      select: { assigned_to: true, status: true, phone: true, region: true, created_at: true },
    });

    // Motoristas aprovados/ativos — cruzar por telefone
    const leadPhones = [...new Set(leads.map(l => l.phone))];
    const drivers = leadPhones.length > 0
      ? await prisma.drivers.findMany({
          where: { phone: { in: leadPhones } },
          select: { phone: true, status: true, created_at: true },
        })
      : [];
    const driverByPhone = new Map(drivers.map(d => [d.phone, d]));

    // Corridas completadas por motorista (pra medir "ativado")
    const activeDriverPhones = drivers.filter(d => d.status === 'approved').map(d => d.phone!);
    const ridesCount = activeDriverPhones.length > 0
      ? await prisma.rides.groupBy({
          by: ['driver_id'],
          where: { status: 'completed', driver_id: { in: drivers.map(d => d.phone!).filter(Boolean) } },
          _count: true,
        })
      : [];
    // Build set of driver phones that completed at least 1 ride
    const driverIdsWithRides = new Set(ridesCount.map(r => r.driver_id));
    // Map driver id → phone for lookup
    const driversById = await (activeDriverPhones.length > 0
      ? prisma.drivers.findMany({ where: { status: 'approved', phone: { in: leadPhones } }, select: { id: true, phone: true } })
      : Promise.resolve([]));
    const activatedPhones = new Set(driversById.filter(d => driverIdsWithRides.has(d.id)).map(d => d.phone));

    // Funcionários com regiões
    const staff = await prisma.admins.findMany({
      where: { is_active: true, lead_regions: { not: null } },
      select: { id: true, name: true, email: true, lead_regions: true },
    });

    // Agregar por funcionário
    const performance = staff.map(s => {
      const myLeads = leads.filter(l => l.assigned_to === s.id);
      const contacted = myLeads.filter(l => l.status === 'contacted' || l.status === 'converted');
      const converted = myLeads.filter(l => l.status === 'converted');
      const approved = myLeads.filter(l => {
        const d = driverByPhone.get(l.phone);
        return d && d.status === 'approved';
      });
      const activated = myLeads.filter(l => activatedPhones.has(l.phone));
      const total = myLeads.length;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        regions: s.lead_regions,
        total,
        contacted: contacted.length,
        converted: converted.length,
        approved: approved.length,
        activated: activated.length,
        conversionRate: total > 0 ? Math.round((activated.length / total) * 100) : 0,
      };
    });

    // Leads sem dono
    const unassigned = leads.filter(l => !l.assigned_to);

    return res.json({
      success: true,
      data: {
        staff: performance,
        unassigned: unassigned.length,
        totalLeads: leads.length,
      },
    });
  } catch (err) {
    console.error('[CONSULTANT_LEADS] performance error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao calcular performance' });
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
