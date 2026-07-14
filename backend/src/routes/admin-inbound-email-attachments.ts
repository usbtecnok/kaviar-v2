import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { InboundAttachmentValidationError, inboundEmailAttachmentsService } from '../services/inbound-email-attachments.service';

const router = Router();

router.use(authenticateAdmin, requireSuperAdmin);

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const result = await inboundEmailAttachmentsService.createDownloadUrl(String(req.params.id || ''));
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof InboundAttachmentValidationError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error('[ADMIN_INBOUND_EMAIL_ATTACHMENTS_DOWNLOAD_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao gerar download temporario do anexo.' });
  }
});

export default router;