import { Request, Response } from 'express';
import { AdminService } from './service';
import { 
  driversQuerySchema, 
  passengersQuerySchema, 
  ridesQuerySchema, 
  rideIdSchema,
  driverIdSchema,
  suspendDriverSchema,
  cancelRideSchema,
  reassignRideSchema,
  forceCompleteRideSchema
} from './schemas';

export class AdminController {
  private adminService = new AdminService();

  // GET /api/admin/drivers
  getDrivers = async (req: Request, res: Response) => {
    try {
      const query = driversQuerySchema.parse(req.query);
      const result = await this.adminService.getDrivers(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar motoristas',
      });
    }
  };

  // GET /api/admin/drivers/:id
  getDriverById = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const driver = await this.adminService.getDriverById(id);

      res.json({
        success: true,
        data: driver,
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Motorista não encontrado' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar motorista',
      });
    }
  };

  // PUT /api/admin/drivers/:id/approve
  approveDriver = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const driver = await this.adminService.approveDriver(id);

      res.json({
        success: true,
        data: driver,
        message: 'Motorista aprovado com sucesso',
      });
    } catch (error) {
      // Handle eligibility error specifically (only when gates are enabled)
      if (error instanceof Error && (error as any).code === 'DRIVER_NOT_ELIGIBLE') {
        return res.status(400).json({
          success: false,
          error: 'DRIVER_NOT_ELIGIBLE',
          missingRequirements: (error as any).missingRequirements,
          details: (error as any).details
        });
      }

      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar motorista',
      });
    }
  };

  // PUT /api/admin/drivers/:id/suspend
  suspendDriver = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const suspensionData = suspendDriverSchema.parse(req.body);
      const adminId = (req as any).admin.id; // From auth middleware
      
      const driver = await this.adminService.suspendDriver(id, suspensionData, adminId);

      res.json({
        success: true,
        data: driver,
        message: 'Motorista suspenso com sucesso',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao suspender motorista',
      });
    }
  };

  // PUT /api/admin/drivers/:id/reactivate
  reactivateDriver = async (req: Request, res: Response) => {
    try {
      const { id } = driverIdSchema.parse(req.params);
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ success: false, error: 'Admin ID required' });
      }
      
      const driver = await this.adminService.reactivateDriver(id, adminId);

      res.json({
        success: true,
        data: driver,
        message: 'Motorista reativado com sucesso',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrado') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao reativar motorista',
      });
    }
  };

  // GET /api/admin/passengers
  getPassengers = async (req: Request, res: Response) => {
    try {
      const query = passengersQuerySchema.parse(req.query);
      const result = await this.adminService.getPassengers(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar passageiros',
      });
    }
  };

  // GET /api/admin/rides
  getRides = async (req: Request, res: Response) => {
    try {
      const query = ridesQuerySchema.parse(req.query);
      const result = await this.adminService.getRides(query);

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
      const ride = await this.adminService.getRideById(id);

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

  // PUT /api/admin/rides/:id/cancel
  cancelRide = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const cancelData = cancelRideSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      
      const ride = await this.adminService.cancelRide(id, cancelData, adminId);

      res.json({
        success: true,
        data: ride,
        message: 'Corrida cancelada com sucesso',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao cancelar corrida',
      });
    }
  };

  // PUT /api/admin/rides/:id/reassign-driver
  reassignDriver = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const reassignData = reassignRideSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      
      const ride = await this.adminService.reassignDriver(id, reassignData, adminId);

      res.json({
        success: true,
        data: ride,
        message: 'Motorista reatribuído com sucesso',
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('não encontrada') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao reatribuir motorista',
      });
    }
  };

  // PUT /api/admin/rides/:id/force-complete
  forceCompleteRide = async (req: Request, res: Response) => {
    try {
      const { id } = rideIdSchema.parse(req.params);
      const forceCompleteData = forceCompleteRideSchema.parse(req.body);
      const adminId = (req as any).admin.id;
      
      const ride = await this.adminService.forceCompleteRide(id, forceCompleteData, adminId);

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
}
