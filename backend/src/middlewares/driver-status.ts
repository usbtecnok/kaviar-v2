import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../modules/admin/service';
import { DriverEnforcementService } from '../services/driver-enforcement';

const adminService = new AdminService();
const enforcementService = new DriverEnforcementService();

export const checkDriverStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.body.driverId || req.params.driverId || (req as any).driver?.id;
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista não fornecido',
      });
    }

    // Check enforcement status first
    const enforcementStatus = await enforcementService.checkDriverStatus(driverId);
    if (enforcementStatus.isBlocked) {
      const errorCode = `DRIVER_${enforcementStatus.blockReason}`;
      
      return res.status(403).json({
        success: false,
        error: errorCode,
        message: enforcementStatus.message,
        details: enforcementStatus.details,
        contact: 'Entre em contato com o suporte para mais informações'
      });
    }

    // Check if driver can accept rides
    const canAcceptRides = await adminService.canDriverAcceptRides(driverId);
    
    if (!canAcceptRides) {
      return res.status(403).json({
        success: false,
        error: 'Motorista não está autorizado a aceitar corridas',
      });
    }

    next();
  } catch (error) {
    console.error('Driver status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status do motorista',
    });
  }
};
