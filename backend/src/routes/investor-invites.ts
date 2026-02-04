import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { emailService } from '../services/email/email.service';

const router = Router();

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'], {
    errorMap: () => ({ message: 'Role deve ser INVESTOR_VIEW ou ANGEL_VIEWER' })
  })
});

const inviteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { success: false, error: 'Muitos convites enviados. Aguarde 1 minuto.' }
});

const generateInviteToken = (userId: string, userType: string) => {
  return jwt.sign(
    { userId, userType, type: 'password_reset' },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
};

router.post('/invite', authenticateAdmin, requireSuperAdmin, inviteRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, role } = inviteSchema.parse(req.body);

    // Bloquear placeholders
    if (email.includes('<') || email.includes('>')) {
      return res.status(400).json({ success: false, error: 'Email inválido' });
    }

    // Verificar se email já existe com role diferente
    const existing = await prisma.admins.findUnique({
      where: { email },
      select: { id: true, role: true }
    });

    if (existing && existing.role !== role) {
      return res.status(409).json({ 
        success: false, 
        error: `Email já cadastrado com role ${existing.role}. Não é possível alterar role automaticamente.` 
      });
    }

    // UPSERT: criar ou atualizar
    const admin = await prisma.admins.upsert({
      where: { email },
      create: {
        email,
        name: role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer',
        role,
        password: '$2a$10$placeholder', // Força uso do reset
        must_change_password: true,
        is_active: true
      },
      update: {
        must_change_password: true,
        is_active: true,
        role // Mantém role se já existir com mesma role
      },
      select: { id: true, email: true, name: true }
    });

    // Gerar token de convite (mesmo fluxo de reset)
    const token = generateInviteToken(admin.id, 'admin');
    const resetUrl = `${config.frontendUrl}/admin/reset-password?token=${token}`;

    // Enviar email de convite
    await emailService.sendMail({
      to: admin.email,
      subject: 'KAVIAR - Convite para Acesso',
      html: `
        <h2>Convite para Acesso ao Sistema KAVIAR</h2>
        <p>Olá ${admin.name},</p>
        <p>Você foi convidado para acessar o sistema KAVIAR com permissões de ${role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer'} (read-only).</p>
        <p>Clique no link abaixo para definir sua senha:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Este link expira em 15 minutos.</p>
        <p>Após definir sua senha, faça login em: ${config.frontendUrl}/admin/login</p>
      `,
      text: `Olá ${admin.name},\n\nVocê foi convidado para acessar o sistema KAVIAR com permissões de ${role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer'} (read-only).\n\nAcesse: ${resetUrl}\n\nEste link expira em 15 minutos.\n\nApós definir sua senha, faça login em: ${config.frontendUrl}/admin/login`
    });

    // Resposta neutra (segurança)
    return res.json({ 
      success: true, 
      message: 'Convite enviado (se o email existir, receberá instruções).' 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Erro ao enviar convite:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar convite' });
  }
});

export default router;
