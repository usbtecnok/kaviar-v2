import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin, requireRole } from '../middlewares/auth';

const router = Router();
const COMPLIANCE_ROLES = requireRole(['SUPER_ADMIN', 'TERRITORIAL_MANAGER']);
const VALID_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'];

// POST /api/admin/territories/:id/moto-passenger-compliance
router.post('/:id/moto-passenger-compliance', authenticateAdmin, COMPLIANCE_ROLES, async (req: Request, res: Response) => {
  try {
    const territory = await prisma.operational_territories.findUnique({ where: { id: req.params.id } });
    if (!territory) return res.status(404).json({ success: false, error: 'Território não encontrado' });

    const { municipality_name, consultation_date, prefecture_notes, protocol_number, document_url } = req.body;
    const admin = (req as any).admin;

    const compliance = await prisma.moto_passenger_compliance.upsert({
      where: { territory_id: req.params.id },
      create: {
        territory_id: req.params.id,
        municipality_name: municipality_name || null,
        consultation_date: consultation_date ? new Date(consultation_date) : null,
        consulted_by_admin_id: admin.id,
        prefecture_notes: prefecture_notes || null,
        protocol_number: protocol_number || null,
        document_url: document_url || null,
        status: 'SUBMITTED',
      },
      update: {
        municipality_name: municipality_name || undefined,
        consultation_date: consultation_date ? new Date(consultation_date) : undefined,
        consulted_by_admin_id: admin.id,
        prefecture_notes: prefecture_notes || undefined,
        protocol_number: protocol_number || undefined,
        document_url: document_url || undefined,
        status: 'SUBMITTED',
        updated_at: new Date(),
      },
    });

    res.status(201).json({ success: true, data: compliance });
  } catch (err: any) {
    console.error('[MOTO_COMPLIANCE] create error:', err.message);
    res.status(500).json({ success: false, error: 'Erro ao registrar compliance' });
  }
});

// GET /api/admin/territories/:id/moto-passenger-compliance
router.get('/:id/moto-passenger-compliance', authenticateAdmin, COMPLIANCE_ROLES, async (req: Request, res: Response) => {
  try {
    const compliance = await prisma.moto_passenger_compliance.findUnique({ where: { territory_id: req.params.id } });
    if (!compliance) return res.status(404).json({ success: false, error: 'Compliance não encontrado para este território' });
    res.json({ success: true, data: compliance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao buscar compliance' });
  }
});

// PATCH /api/admin/territories/:id/moto-passenger-compliance — Super Admin only
router.patch('/:id/moto-passenger-compliance', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const compliance = await prisma.moto_passenger_compliance.findUnique({ where: { territory_id: req.params.id } });
    if (!compliance) return res.status(404).json({ success: false, error: 'Compliance não encontrado' });

    const { status, rejection_reason } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido. Use: APPROVED ou REJECTED' });
    }

    const admin = (req as any).admin;
    const updates: any = { status, updated_at: new Date() };

    if (status === 'APPROVED') {
      updates.approved_by_admin_id = admin.id;
      updates.approved_at = new Date();
      updates.rejection_reason = null;
    } else if (status === 'REJECTED') {
      updates.rejection_reason = rejection_reason || null;
      updates.approved_by_admin_id = null;
      updates.approved_at = null;
    }

    const updated = await prisma.moto_passenger_compliance.update({
      where: { territory_id: req.params.id },
      data: updates,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[MOTO_COMPLIANCE] patch error:', err.message);
    res.status(500).json({ success: false, error: 'Erro ao atualizar compliance' });
  }
});

export default router;
