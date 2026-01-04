import { Request, Response, NextFunction } from 'express';
import { DriverEnforcementService } from '../services/driver-enforcement';

const enforcementService = new DriverEnforcementService();

export interface EnforcementRequest extends Request {
  driverId?: string;
}

/**
 * Middleware to check driver enforcement status
 * Apply to endpoints where drivers perform operations
 */
export const checkDriverEnforcement = async (
  req: EnforcementRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract driver ID from params or body
    const driverId = req.params.id || req.params.driverId || req.body.driverId;
    
    if (!driverId) {
      return next(); // Skip if no driver ID found
    }

    const statusCheck = await enforcementService.checkDriverStatus(driverId);
    
    if (statusCheck.isBlocked) {
      const errorCode = `DRIVER_${statusCheck.blockReason}`;
      
      return res.status(403).json({
        success: false,
        error: errorCode,
        message: statusCheck.message,
        details: statusCheck.details,
        contact: 'Entre em contato com o suporte para mais informações'
      });
    }

    // Store driver ID for use in route handlers
    req.driverId = driverId;
    next();
  } catch (error) {
    console.error('Driver enforcement check failed:', error);
    // Don't block on enforcement errors, just log and continue
    next();
  }
};

/**
 * Specific middleware for ride acceptance
 */
export const checkDriverForRideAcceptance = async (
  req: EnforcementRequest,
  res: Response,
  next: NextFunction
) => {
  // This would be applied to ride acceptance endpoints
  return checkDriverEnforcement(req, res, next);
};

/**
 * Specific middleware for location updates
 */
export const checkDriverForLocationUpdate = async (
  req: EnforcementRequest,
  res: Response,
  next: NextFunction
) => {
  // This would be applied to location update endpoints
  return checkDriverEnforcement(req, res, next);
};
