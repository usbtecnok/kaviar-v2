import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { FeatureDisabledError } from '../errors/FeatureDisabledError';
import { StatusTransitionError } from '../services/premium-tourism';

export const requirePremiumTourismEnabled = (req: Request, res: Response, next: NextFunction) => {
  if (!config.premiumTourism.enablePremiumTourism) {
    return res.status(404).json({ 
      success: false, 
      error: 'Feature not available' 
    });
  }
  next();
};

export const handleFeatureDisabledError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof FeatureDisabledError) {
    return res.status(404).json({
      success: false,
      error: 'Feature not available'
    });
  }
  next(error);
};

export const handleStatusTransitionError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof StatusTransitionError) {
    return res.status(409).json({
      success: false,
      error: 'INVALID_STATUS_TRANSITION',
      message: error.message
    });
  }
  next(error);
};
