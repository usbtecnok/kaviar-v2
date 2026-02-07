import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Mantém compatibilidade: tenta ADMIN_JWT_SECRET e depois JWT_SECRET.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { throw new Error("JWT_SECRET missing"); }


function getBearerToken(req: Request): string | null {
  const header = (req.headers.authorization || (req.headers as any).Authorization) as string | undefined;
  if (!header || typeof header !== 'string') return null;

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token.trim();
}

export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, error: 'JWT secret not configured' });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Compatibilidade: token antigo pode ter adminId; novo usa userId
    const adminId = decoded.userId || decoded.adminId;
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    // Se vier userType e não for ADMIN, bloqueia
    if (decoded.userType && decoded.userType !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const admin = await prisma.admins.findUnique({ 
      where: { id: adminId },
    });
    
    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    // Adicionar role ao req.admin
    (req as any).admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    (req as any).adminId = adminId;

    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

/**
 * Middleware de autorização por papel (role)
 * Uso:
 *   adminRouter.use(authenticateAdmin);
 *   adminRouter.use(requireRole(['SUPER_ADMIN', 'ANGEL_VIEWER']));
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = (req as any).admin;

      if (!admin) {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      if (allowedRoles.includes(admin.role)) {
        return next();
      }

      return res.status(403).json({ 
        success: false, 
        error: 'Acesso negado. Permissão insuficiente.',
        requiredRoles: allowedRoles,
        userRole: admin.role,
      });
    } catch (_err) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
  };
}

/**
 * Middleware para exigir SUPER_ADMIN
 */
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);

/**
 * Middleware para permitir leitura (SUPER_ADMIN ou ANGEL_VIEWER)
 */
export const allowReadAccess = requireRole(['SUPER_ADMIN', 'ANGEL_VIEWER']);

export async function authenticateDriver(req: Request, res: Response, next: NextFunction) {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, error: 'JWT secret not configured' });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.userType !== 'DRIVER') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const driver = await prisma.drivers.findUnique({ 
      where: { id: decoded.userId }
    });
    
    if (!driver) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    (req as any).driver = driver;
    (req as any).userId = decoded.userId;

    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

export async function authenticatePassenger(req: Request, res: Response, next: NextFunction) {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ success: false, error: 'JWT secret not configured' });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.userType !== 'PASSENGER') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }

    const passenger = await prisma.passengers.findUnique({ 
      where: { id: decoded.userId }
    });
    
    if (!passenger) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    (req as any).passenger = passenger;
    (req as any).userId = decoded.userId;

    return next();
  } catch (_err) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}
