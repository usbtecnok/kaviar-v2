import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { audit, auditCtx } from '../../utils/audit';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres')
});

export class DriverAdminController {

  // PUT /api/admin/drivers/:id/documents/:docId/verify
  verifyDocument = async (req: Request, res: Response) => {
    try {
      const { id, docId } = req.params;
      const ctx = auditCtx(req);

      const doc = await prisma.driver_documents.findUnique({ where: { id: docId } });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Documento não encontrado' });
      }
      if (doc.driver_id !== id) {
        return res.status(403).json({ success: false, error: 'Documento não pertence a este motorista' });
      }
      if (doc.status === 'VERIFIED') {
        return res.status(400).json({ success: false, error: 'Documento já está verificado' });
      }
      if (doc.status !== 'SUBMITTED') {
        return res.status(400).json({ success: false, error: `Documento com status "${doc.status}" não pode ser verificado` });
      }

      const updated = await prisma.driver_documents.update({
        where: { id: docId },
        data: {
          status: 'VERIFIED',
          verified_at: new Date(),
          verified_by_admin_id: ctx.adminId,
        }
      });

      await audit({
        adminId: ctx.adminId,
        adminEmail: ctx.adminEmail,
        action: 'verify_document',
        entityType: 'driver_document',
        entityId: docId,
        oldValue: { status: doc.status },
        newValue: { status: 'VERIFIED', driver_id: id, type: doc.type },
        ipAddress: ctx.ip,
        userAgent: ctx.ua,
      });

      res.json({ success: true, data: updated, message: 'Documento verificado com sucesso' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro ao verificar documento' });
    }
  };

  // PUT /api/admin/drivers/:id/documents/:docId/reject
  rejectDocument = async (req: Request, res: Response) => {
    try {
      const { id, docId } = req.params;
      const ctx = auditCtx(req);

      const parsed = rejectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
      }
      const { reason } = parsed.data;

      const doc = await prisma.driver_documents.findUnique({ where: { id: docId } });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Documento não encontrado' });
      }
      if (doc.driver_id !== id) {
        return res.status(403).json({ success: false, error: 'Documento não pertence a este motorista' });
      }
      if (doc.status === 'VERIFIED') {
        return res.status(400).json({ success: false, error: 'Documento já verificado não pode ser rejeitado' });
      }
      if (doc.status === 'rejected') {
        return res.status(400).json({ success: false, error: 'Documento já está rejeitado' });
      }

      const updated = await prisma.driver_documents.update({
        where: { id: docId },
        data: {
          status: 'rejected',
          rejected_at: new Date(),
          rejected_by_admin_id: ctx.adminId,
          reject_reason: reason,
        }
      });

      await audit({
        adminId: ctx.adminId,
        adminEmail: ctx.adminEmail,
        action: 'reject_document',
        entityType: 'driver_document',
        entityId: docId,
        oldValue: { status: doc.status },
        newValue: { status: 'rejected', driver_id: id, type: doc.type, reason },
        ipAddress: ctx.ip,
        userAgent: ctx.ua,
      });

      res.json({ success: true, data: updated, message: 'Documento rejeitado' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Erro ao rejeitar documento' });
    }
  };
}
