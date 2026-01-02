import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../modules/admin/service';

const adminService = new AdminService();

export const checkDriverStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.body.driverId || req.params.driverId || (req as any).driver?.id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista não fornecido',
      });
    }

    const canAcceptRides = await adminService.canDriverAcceptRides(driverId);
    
    if (!canAcceptRides) {
      return res.status(403).json({
        success: false,
        error: 'Motorista não está autorizado a aceitar corridas',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status do motorista',
    });
  }
};
