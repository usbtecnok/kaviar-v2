import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const ALLOWED_TYPES = ['DRIVER', 'PASSENGER', 'LOCAL_BUSINESS', 'ASSOCIATION', 'PARTNER'];

// POST /api/public/team-referral
router.post('/team-referral', async (req: Request, res: Response) => {
  try {
    const { code, lead_type, name, phone, email, notes } = req.body;

    if (!code || !name || !phone || !lead_type) {
      return res.status(400).json({ success: false, error: 'Código, nome, telefone e tipo são obrigatórios' });
    }
    if (name.trim().length < 2) return res.status(400).json({ success: false, error: 'Nome deve ter pelo menos 2 caracteres' });
    const digits = (phone as string).replace(/\D/g, '');
    if (digits.length < 10) return res.status(400).json({ success: false, error: 'Telefone deve ter pelo menos 10 dígitos' });
    if (!ALLOWED_TYPES.includes(lead_type)) return res.status(400).json({ success: false, error: 'Tipo de lead não permitido' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: 'Email inválido' });
    if (notes && notes.length > 500) return res.status(400).json({ success: false, error: 'Observações devem ter no máximo 500 caracteres' });

    // Resolve member by public code
    const member = await prisma.manager_team_members.findFirst({
      where: { public_referral_code: (code as string).toUpperCase().trim(), referral_code_active: true },
      select: { id: true, manager_admin_id: true, territory_id: true },
    });
    if (!member) return res.status(400).json({ success: false, error: 'Código inválido ou inativo' });

    // Resolve territory: fallback to admin's territory_access if member has none
    let territory_id = member.territory_id;
    if (!territory_id) {
      const access = await prisma.admin_territory_access.findFirst({ where: { admin_id: member.manager_admin_id }, select: { territory_id: true } });
      territory_id = access?.territory_id || null;
    }

    // Deduplication: same phone + same captador
    const existing = await prisma.crm_leads.findFirst({
      where: { phone: digits, captured_by_member_id: member.id, deleted_at: null },
      select: { id: true },
    });
    if (existing) return res.status(409).json({ success: false, error: 'Este contato já foi registrado por este captador' });

    await prisma.crm_leads.create({
      data: {
        name: name.trim(),
        phone: digits,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
        lead_type,
        source: 'TEAM_MEMBER_REFERRAL',
        status: 'NEW',
        priority: 'NORMAL',
        captured_by_member_id: member.id,
        assigned_admin_id: member.manager_admin_id,
        territory_id,
        created_by_admin_id: null,
      },
    });

    res.json({ success: true, message: 'Lead registrado com sucesso' });
  } catch (err) {
    console.error('[PUBLIC_TEAM_REFERRAL]', err);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export default router;
