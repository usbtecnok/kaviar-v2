import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Mantém compatibilidade: tenta ADMIN_JWT_SECRET e depois JWT_SECRET.
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// Whitelist de emails autorizados
const ALLOWED_ADMIN_EMAILS = [
  'suporte@usbtecnok.com.br',
  'financeiro@usbtecnok.com.br'
];

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
      include: { roles: true }
    });
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    // Whitelist check
    if (!ALLOWED_ADMIN_EMAILS.includes(admin.email.toLowerCase())) {
      return res.status(403).json({ success: false, error: 'Acesso não autorizado' });
    }

    (req as any).admin = admin;
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
 *   adminRouter.use(requireRole(['SUPER_ADMIN', 'OPERATOR']));
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = (req as any).admin;

      if (!admin) {
        return res.status(401).json({ success: false, error: 'Token inválido' });
      }

      // Admin carregado com include: { roles: true }
      const roleName = admin.roles?.name;

      if (roleName && allowedRoles.includes(roleName)) {
        return next();
      }

      return res.status(403).json({ success: false, error: 'Acesso negado' });
    } catch (_err) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
  };
}

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
