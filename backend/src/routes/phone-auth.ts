import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { phoneChallengeService, ChallengePurpose, ChallengeUserType } from '../services/phone-challenge.service';
import { normalizeE164 } from '../utils/phone';
import { WhatsAppService } from '../modules/whatsapp/whatsapp.service';
import { WhatsAppEvents } from '../modules/whatsapp/whatsapp-events';

const router = Router();
const whatsappEvents = new WhatsAppEvents(new WhatsAppService());

// Rate limit por IP: max 10 envios/hora
const sendCodeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Muitas solicitações. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit por IP: max 15 verificações/hora
const verifyCodeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendCodeSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  userType: z.enum(['driver', 'passenger'], { errorMap: () => ({ message: 'Tipo de usuário inválido' }) }),
  purpose: z.enum(['phone_verification', 'password_reset'], { errorMap: () => ({ message: 'Finalidade inválida' }) }),
});

const verifyCodeSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido'),
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
  purpose: z.enum(['phone_verification', 'password_reset'], { errorMap: () => ({ message: 'Finalidade inválida' }) }),
});

// Lookup user by phone (unified)
async function findUserByPhone(phone: string, userType: ChallengeUserType) {
  const normalized = normalizeE164(phone);
  if (userType === 'driver') {
    return prisma.drivers.findFirst({ where: { phone: normalized }, select: { id: true, name: true, phone: true } });
  }
  return prisma.passengers.findFirst({ where: { phone: normalized }, select: { id: true, name: true, phone: true } });
}

// POST /api/auth/phone/send-code
router.post('/phone/send-code', sendCodeRateLimit, async (req, res) => {
  try {
    const { phone, userType, purpose } = sendCodeSchema.parse(req.body);

    let normalized: string;
    try {
      normalized = normalizeE164(phone);
    } catch {
      return res.status(400).json({ success: false, error: 'Telefone em formato inválido.' });
    }

    // Para password_reset, verificar se usuário existe (sem revelar)
    // Para phone_verification, vincular ao usuário dono do telefone
    let userId: string | undefined;

    const user = await findUserByPhone(normalized, userType);

    if (purpose === 'password_reset') {
      // SECURITY: sempre retorna sucesso, mesmo se conta não existe
      if (!user) {
        return res.json({ success: true, message: 'Se o telefone estiver cadastrado, você receberá um código.' });
      }
      userId = user.id;
    } else if (purpose === 'phone_verification') {
      if (!user) {
        return res.status(404).json({ success: false, error: 'Telefone não encontrado. Verifique o número.' });
      }
      userId = user.id;
    }

    const result = await phoneChallengeService.create(normalized, userType, purpose as ChallengePurpose, userId);

    if (!result.success) {
      return res.status(429).json({ success: false, error: result.error });
    }

    // Enviar via WhatsApp
    try {
      await whatsappEvents.authVerificationCode(normalized, { '1': result.code });
    } catch (whatsappErr) {
      console.error('[PHONE_CHALLENGE] WhatsApp send failed:', (whatsappErr as Error).message);
      return res.status(500).json({ success: false, error: 'Erro ao enviar código. Tente novamente.' });
    }

    console.log(`[PHONE_CHALLENGE] code sent phone=${normalized.substring(0, 7)}*** purpose=${purpose} userType=${userType}`);
    res.json({ success: true, message: 'Código enviado via WhatsApp.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('[PHONE_CHALLENGE] send-code error');
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
});

// POST /api/auth/phone/verify-code
router.post('/phone/verify-code', verifyCodeRateLimit, async (req, res) => {
  try {
    const { phone, code, purpose } = verifyCodeSchema.parse(req.body);

    let normalized: string;
    try {
      normalized = normalizeE164(phone);
    } catch {
      return res.status(400).json({ success: false, error: 'Telefone em formato inválido.' });
    }

    const result = await phoneChallengeService.verify(normalized, code, purpose as ChallengePurpose);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Ação pós-verificação depende do purpose
    if (purpose === 'phone_verification') {
      if (!result.userId || !result.userType) {
        return res.status(400).json({ success: false, error: 'Código inválido.' });
      }
      // Atualizar phone_verified_at pelo userId do challenge (não por lookup de telefone)
      const now = new Date();
      if (result.userType === 'driver') {
        await prisma.drivers.update({ where: { id: result.userId }, data: { phone_verified_at: now } });
      } else {
        await prisma.passengers.update({ where: { id: result.userId }, data: { phone_verified_at: now } });
      }
      console.log(`[PHONE_VERIFIED] userType=${result.userType} userId=${result.userId} phone=${normalized.substring(0, 7)}***`);
      return res.json({ success: true, message: 'Telefone verificado com sucesso.' });
    }

    if (purpose === 'password_reset') {
      if (!result.userId) {
        return res.status(400).json({ success: false, error: 'Código inválido.' });
      }
      // Gerar token de reset (mesmo formato do fluxo por email)
      const resetToken = jwt.sign(
        { userId: result.userId, userType: result.userType, purpose: 'password_reset' },
        config.jwtResetSecret,
        { expiresIn: '15m' },
      );
      console.log(`[PHONE_RESET_TOKEN] issued for userType=${result.userType} userId=${result.userId}`);
      return res.json({ success: true, resetToken });
    }

    res.status(400).json({ success: false, error: 'Finalidade inválida.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('[PHONE_CHALLENGE] verify-code error');
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
});

export { router as phoneAuthRoutes };
