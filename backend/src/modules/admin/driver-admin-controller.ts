import { Request, Response } from 'express';
import { DriverVerificationService } from '../../services/driver-verification';
import { 
  driverIdSchema,
  documentIdSchema,
  documentVerificationSchema,
  documentRejectionSchema
} from '../governance/driver-schemas';

export class DriverAdminController {
  private verificationService = new DriverVerificationService();

  // GET /api/admin/drivers/:id/verification
  getVerificationStatus = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      
      const eligibility = await this.verificationService.evaluateEligibility(id);

      res.json({
        success: true,
        data: eligibility
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar status'
      });
    }
  };

  // PUT /api/admin/drivers/:id/documents/:docId/verify
  verifyDocument = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const { docId } = documentIdSchema.parse(req.params);
      const { adminId } = documentVerificationSchema.parse(req.body);
      
      const document = await this.verificationService.verifyDocument(id, docId, adminId);

      res.json({
        success: true,
        data: document,
        message: 'Documento verificado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar documento'
      });
    }
  };

  // PUT /api/admin/drivers/:id/documents/:docId/reject
  rejectDocument = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const { docId } = documentIdSchema.parse(req.params);
      const { adminId, reason } = documentRejectionSchema.parse(req.body);
      
      const document = await this.verificationService.rejectDocument(id, docId, adminId, reason);

      res.json({
        success: true,
        data: document,
        message: 'Documento rejeitado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao rejeitar documento'
      });
    }
  };
}
