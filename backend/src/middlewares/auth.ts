import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso requerido',
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Verify admin still exists and is active
    const admin = await prisma.admins.findUnique({
      where: { id: decoded.adminId },
      include: { role: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
      });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado',
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
      });
    }

    next();
  };
};
