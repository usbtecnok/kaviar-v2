import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { emailService } from '../services/email/email.service';
import { whatsappEvents } from '../modules/whatsapp';
import { WHATSAPP_ENV } from '../modules/whatsapp/whatsapp-client';

const router = Router();

// Logger estruturado
const logger = {
  info: (data: any, msg: string) => console.log(JSON.stringify({ ...data, level: 'info', message: msg, ts: new Date().toISOString() })),
  warn: (data: any, msg: string) => console.warn(JSON.stringify({ ...data, level: 'warn', message: msg, ts: new Date().toISOString() })),
  error: (data: any, msg: string) => console.error(JSON.stringify({ ...data, level: 'error', message: msg, ts: new Date().toISOString() }))
};

const inviteSchemaEmail = z.object({
  channel: z.literal('email').optional(),
  email: z.string().email('Email inválido'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'])
});

const inviteSchemaWhatsApp = z.object({
  channel: z.literal('whatsapp'),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Telefone deve estar no formato E.164 (+5521...)'),
  role: z.enum(['INVESTOR_VIEW', 'ANGEL_VIEWER'])
});

const inviteSchema = z.union([inviteSchemaEmail, inviteSchemaWhatsApp]);

const inviteRateLimit = rateLimit({
  windowMs: 60 * 1000,
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
  const requestId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const data = inviteSchema.parse(req.body);
    const { role } = data;
    const channel = 'channel' in data ? data.channel : 'email';

    let email: string;
    let phone: string | null = null;
    let displayName: string;

    if (channel === 'whatsapp') {
      phone = (data as any).phone as string;
      email = `whatsapp${phone.replace(/\+/g, '').replace(/\D/g, '')}@kaviar.local`;
      displayName = role === 'INVESTOR_VIEW' ? `Investidor (${phone})` : `Angel Viewer (${phone})`;
    } else {
      email = (data as any).email as string;
      displayName = role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer';
    }

    if (email.includes('<') || email.includes('>')) {
      return res.status(400).json({ success: false, error: 'Identificador inválido' });
    }

    if (channel === 'whatsapp' && !WHATSAPP_ENV.enabled) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp não configurado. Entre em contato com o administrador.' 
      });
    }

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

    const admin = await prisma.admins.upsert({
      where: { email },
      create: {
        email,
        name: displayName,
        role,
        password: '$2a$10$placeholder',
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

    const token = generateInviteToken(admin.id, 'admin');
    const inviteUrl = `https://kaviar.com.br/admin/investor-invites?token=${token}`;

    // WhatsApp first, email fallback
    if (channel === 'whatsapp' && phone && WHATSAPP_ENV.enabled) {
      logger.info({ requestId, phone, role }, 'INVESTOR_INVITE_WHATSAPP_ATTEMPT');
      
      try {
        await whatsappEvents.inviteInvestor(phone, {
          "1": displayName,
          "2": inviteUrl
        });
        
        logger.info({ requestId, phone }, 'INVESTOR_INVITE_WHATSAPP_SENT');
        return res.json({ 
          success: true, 
          message: 'Convite enviado via WhatsApp.' 
        });
      } catch (err: any) {
        const twilioError = {
          requestId,
          phone,
          twilioCode: err?.code,
          twilioStatus: err?.status,
          twilioMessage: err?.message,
          moreInfo: err?.moreInfo,
          stack: err?.stack?.split('\n')[0]
        };
        logger.warn(twilioError, 'INVESTOR_INVITE_WHATSAPP_FAILED');
        // Fallback to email
      }
    }

    // Email fallback
    await emailService.sendMail({
      to: admin.email,
      subject: 'KAVIAR - Convite para Acesso',
      text: `Convite para Acesso ao Sistema KAVIAR\n\nOlá ${displayName},\n\nVocê foi convidado para acessar o sistema KAVIAR como ${role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer'}.\n\nPara configurar sua senha e acessar o sistema, acesse: ${inviteUrl}\n\nEste link expira em 15 minutos.\n\nApós configurar sua senha, acesse: ${config.frontendUrl}/admin/login\n\nEquipe KAVIAR`,
      html: `
        <h2>Convite para Acesso ao Sistema KAVIAR</h2>
        <p>Olá ${displayName},</p>
        <p>Você foi convidado para acessar o sistema KAVIAR como <strong>${role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer'}</strong>.</p>
        <p>Para configurar sua senha e acessar o sistema, clique no link abaixo:</p>
        <p><a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Configurar Senha</a></p>
        <p>Ou copie e cole este link no navegador:</p>
        <p>${inviteUrl}</p>
        <p>Este link expira em 15 minutos.</p>
        <p>Após configurar sua senha, acesse: <a href="${config.frontendUrl}/admin/login">${config.frontendUrl}/admin/login</a></p>
        <br>
        <p>Equipe KAVIAR</p>
      `
    });

    logger.info({ requestId, email }, 'INVESTOR_INVITE_EMAIL_SENT');
    return res.json({ 
      success: true, 
      message: channel === 'whatsapp' ? 'WhatsApp falhou. Convite enviado via email.' : 'Convite enviado via email.' 
    });

  } catch (error: any) {
    logger.error({ requestId, error: error?.message, stack: error?.stack?.split('\n')[0] }, 'INVESTOR_INVITE_ERROR');
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: error.errors[0].message 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao enviar convite. Tente novamente.' 
    });
  }
});

export default router;
