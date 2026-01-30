import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Middleware para verificar se admin tem role específica
 */
export function requireRole(...allowedRoles: string[]) {
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
        error: 'Acesso negado. Permissão insuficiente.',
        requiredRoles: allowedRoles,
        userRole: req.admin.role,
      });
    }

    next();
  };
}

/**
 * Middleware para verificar se é SUPER_ADMIN
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Middleware para permitir leitura (SUPER_ADMIN ou ANGEL_VIEWER)
 */
export const allowReadAccess = requireRole('SUPER_ADMIN', 'ANGEL_VIEWER');
