import { Request, Response } from 'express';
import { DriverVerificationService } from '../../services/driver-verification';
import { 
  driverConsentSchema, 
  documentSubmissionSchema,
  driverIdSchema
} from './driver-schemas';

export class DriverGovernanceController {
  private verificationService = new DriverVerificationService();

  // POST /api/governance/driver/consent
  recordConsent = async (req: Request, res: Response) => {
    try {
      const data = driverConsentSchema.parse(req.body);
      
      const consent = await this.verificationService.recordConsent(
        data.driverId,
        data.consentType,
        data.accepted,
        data.ipAddress,
        data.userAgent
      );

      res.json({
        success: true,
        data: consent,
        message: 'Consentimento registrado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao registrar consentimento'
      });
    }
  };

  // PUT /api/governance/driver/:id/documents
  submitDocuments = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const data = documentSubmissionSchema.parse(req.body);
      
      await this.verificationService.submitDocuments(
        id,
        data.documents,
        data.communityId
      );

      res.json({
        success: true,
        message: 'Documentos enviados com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar documentos'
      });
    }
  };
}
