import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { emailService } from '../services/email/email.service';
import { whatsappService } from '../services/whatsapp';

const router = Router();

const inviteSchemaEmail = z.object({
  channel: z.literal('email').optional(),
  email: z.string().email('Email inválido'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'], {
    errorMap: () => ({ message: 'Role deve ser INVESTOR_VIEW ou ANGEL_VIEWER' })
  })
});

const inviteSchemaWhatsApp = z.object({
  channel: z.literal('whatsapp'),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Telefone deve estar no formato E.164 (+5521...)'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'], {
    errorMap: () => ({ message: 'Role deve ser INVESTOR_VIEW ou ANGEL_VIEWER' })
  })
});

const inviteSchema = z.union([inviteSchemaEmail, inviteSchemaWhatsApp]);

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
    const data = inviteSchema.parse(req.body);
    const { role } = data;
    const channel = 'channel' in data ? data.channel : 'email';

    // Determinar email e phone
    let email: string;
    let phone: string | null = null;
    let displayName: string;

    if (channel === 'whatsapp') {
      phone = (data as any).phone as string;
      // Criar email temporário baseado no phone (único)
      email = `whatsapp${phone.replace(/\+/g, '').replace(/\D/g, '')}@kaviar.local`;
      displayName = role === 'INVESTOR_VIEW' ? `Investidor (${phone})` : `Angel Viewer (${phone})`;
    } else {
      email = (data as any).email as string;
      displayName = role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer';
    }

    // Bloquear placeholders
    if (email.includes('<') || email.includes('>')) {
      return res.status(400).json({ success: false, error: 'Identificador inválido' });
    }

    // Para WhatsApp, verificar se serviço está disponível
    if (channel === 'whatsapp' && !whatsappService.isAvailable()) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp não configurado. Entre em contato com o administrador.' 
      });
    }

    // Verificar se email já existe com role diferente
    const existing = await prisma.admins.findUnique({
      where: { email },
      select: { id: true, role: true }
    });

    if (existing && existing.role !== role) {
      return res.status(409).json({ 
        success: false, 
        error: `Identificador já cadastrado com role ${existing.role}. Não é possível alterar role automaticamente.` 
      });
    }

    // UPSERT: criar ou atualizar
    const admin = await prisma.admins.upsert({
      where: { email },
      create: {
        email,
        name: displayName,
        role,
        password: '$2a$10$placeholder', // Força uso do reset
        must_change_password: true,
        is_active: true
      },
      update: {
        must_change_password: true,
        is_active: true,
        role
      },
      select: { id: true, email: true, name: true }
    });

    // Gerar token de convite (mesmo fluxo de reset)
    const token = generateInviteToken(admin.id, 'admin');
    const resetUrl = `${config.frontendUrl}/admin/reset-password?token=${token}`;

    // Enviar convite pelo canal escolhido
    if (channel === 'whatsapp' && phone) {
      const whatsappBody = `🔐 *KAVIAR - Convite para Acesso*\n\n` +
        `Olá,\n\n` +
        `Você foi convidado para acessar o sistema KAVIAR com permissões de *${role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer'}* (read-only).\n\n` +
        `📱 Defina sua senha:\n${resetUrl}\n\n` +
        `⏱️ Este link expira em *15 minutos*.\n\n` +
        `Após definir sua senha, faça login em:\n${config.frontendUrl}/admin/login`;

      await whatsappService.sendWhatsAppInvite({
        to: phone,
        body: whatsappBody
      });

      return res.json({ 
        success: true, 
        message: 'Convite enviado via WhatsApp.' 
      });
    } else {
      // Email (legacy)
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

      return res.json({ 
        success: true, 
        message: 'Convite enviado (se o email existir, receberá instruções).' 
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Erro ao enviar convite:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar convite' });
  }
});

export default router;
