import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateCommerce } from '../middlewares/commerce-auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// POST /api/commerce/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!JWT_SECRET) return res.status(500).json({ success: false, error: 'Config error' });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email e senha obrigatórios' });

    const user = await prisma.commerce_users.findUnique({ where: { email }, include: { account: { select: { id: true, name: true, is_active: true } } } });
    if (!user || !user.is_active || !user.account.is_active) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Credenciais inválidas' });

    await prisma.commerce_users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    const token = jwt.sign({ commerceUserId: user.id, commerceAccountId: user.account.id, userType: 'COMMERCE', role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, must_change_password: user.must_change_password }, account: { id: user.account.id, name: user.account.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro no login' });
  }
});

// POST /api/commerce/auth/change-password
router.post('/change-password', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ success: false, error: 'Nova senha deve ter ao menos 6 caracteres' });

    const user = await prisma.commerce_users.findUnique({ where: { id: (req as any).commerceUser.id } });
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

    // If must_change_password, current_password check is optional (first access)
    if (!user.must_change_password) {
      if (!current_password) return res.status(400).json({ success: false, error: 'Senha atual obrigatória' });
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.commerce_users.update({ where: { id: user.id }, data: { password_hash, must_change_password: false } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao alterar senha' });
  }
});

export default router;
