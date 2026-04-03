import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// POST /api/public/consultant-lead — sem auth (chamado pelo fluxo WhatsApp)
router.post('/consultant-lead', async (req: Request, res: Response) => {
  try {
    const { name, phone, source } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'name e phone obrigatórios' });
    }

    const lead = await prisma.consultant_leads.create({
      data: { name, phone, source: source || 'whatsapp' },
    });

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

// PATCH /api/admin/consultant-leads/:id — atualizar status/notes
router.patch('/consultant-leads/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const lead = await prisma.consultant_leads.update({
      where: { id: req.params.id },
      data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
    });
    return res.json({ success: true, data: lead });
  } catch (err) {
    console.error('[CONSULTANT_LEADS] update error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar lead' });
  }
});

export default router;
