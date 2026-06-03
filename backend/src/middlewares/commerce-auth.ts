import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

export async function authenticateCommerce(req: Request, res: Response, next: NextFunction) {
  try {
    if (!JWT_SECRET) return res.status(500).json({ success: false, error: 'JWT not configured' });

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token ausente' });

    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    if (!decoded.commerceUserId || decoded.userType !== 'COMMERCE') {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    const user = await prisma.commerce_users.findUnique({
      where: { id: decoded.commerceUserId },
      include: { account: { select: { id: true, name: true, is_active: true, status: true } } },
    });

    if (!user || !user.is_active || !user.account.is_active) {
      return res.status(401).json({ success: false, error: 'Conta inativa' });
    }

    (req as any).commerceUser = { id: user.id, name: user.name, email: user.email, role: user.role, must_change_password: user.must_change_password };
    (req as any).commerceAccount = user.account;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido' });
  }
}
