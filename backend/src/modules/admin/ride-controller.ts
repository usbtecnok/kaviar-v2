import { Request, Response } from 'express';
import { RideAdminService } from './ride-service';
import { 
  ridesQuerySchema, 
  rideIdSchema,
  cancelRideSchema,
  reassignRideSchema,
  forceCompleteRideSchema,
  updateStatusSchema,
  auditQuerySchema
} from './schemas';

export class RideAdminController {
  private rideService = new RideAdminService();

  // GET /api/admin/rides
  getRides = async (req: Request, res: Response) => {
    try {
      const query = ridesQuerySchema.parse(req.query);
      const result = await this.rideService.getRides(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar corridas',
      });
    }
  };

  // GET /api/admin/rides/:id
  getRideById = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const ride = await this.rideService.getRideById(id);

      res.json({
        success: true,
        data: ride,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Corrida não encontrada' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar corrida',
      });
    }
  };

  // PATCH /api/admin/rides/:id/status
  updateRideStatus = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const statusData = updateStatusSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      
      const ride = await this.rideService.updateRideStatus(id, statusData, adminId);

      res.json({
        success: true,
        data: ride,
        message: 'Status atualizado com sucesso',
      });
    } catch (error) {
      // Handle concurrent modification specifically
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        return res.status(409).json({
          success: false,
          error: 'Conflito: o status da corrida foi modificado por outra operação. Tente novamente.',
          code: 'CONCURRENT_MODIFICATION'
        });
      }

      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar status',
      });
    }
  };

  // POST /api/admin/rides/:id/cancel
  cancelRide = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const cancelData = cancelRideSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      
      const ride = await this.rideService.cancelRide(id, cancelData, adminId);

      res.json({
        success: true,
        data: ride,
        message: 'Corrida cancelada com sucesso',
      });
    } catch (error) {
      // Handle concurrent modification specifically
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        return res.status(409).json({
          success: false,
          error: 'Conflito: a corrida foi modificada por outra operação. Tente novamente.',
          code: 'CONCURRENT_MODIFICATION'
        });
      }

      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar corrida',
      });
    }
  };

  // POST /api/admin/rides/:id/force-complete
  forceCompleteRide = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const forceCompleteData = forceCompleteRideSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      const adminRole = (req as any).admin.role;
      
      // Only SUPER_ADMIN can force complete
      if (adminRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Apenas SUPER_ADMIN pode forçar finalização de corridas',
        });
      }
      
      const ride = await this.rideService.forceCompleteRide(id, forceCompleteData, adminId);

      res.json({
        success: true,
        data: ride,
        message: 'Corrida finalizada com sucesso',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao finalizar corrida',
      });
    }
  };

  // GET /api/admin/rides/audit
  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const query = auditQuerySchema.parse(req.query);
      const result = await this.rideService.getAuditLogs(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar logs de auditoria',
      });
    }
  };
}
