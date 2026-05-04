import { Request, Response, NextFunction } from 'express';

export const requireLocalSupportEnabled = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.LOCAL_SUPPORT_DRIVERS_ENABLED !== 'true') {
    return res.status(404).json({ 
      success: false, 
      error: 'Feature not available' 
    });
  }
  next();
};