import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { normalizeE164 } from '../utils/phone';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_SEND_LIMIT_PER_HOUR = 5;
const OTP_LENGTH = 6;

export type ChallengePurpose = 'phone_verification' | 'password_reset';
export type ChallengeUserType = 'driver' | 'passenger';

interface SendResult {
  success: boolean;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  error?: string;
  userId?: string;
  userType?: ChallengeUserType;
}

function generateOTP(): string {
  // Crypto-secure 6-digit code (no leading zero bias)
  return String(crypto.randomInt(100000, 999999));
}

export const phoneChallengeService = {
  /**
   * Cria challenge e retorna o código em texto claro (para envio).
   * Rate limit por telefone: max 5 envios/hora.
   */
  async create(phone: string, userType: ChallengeUserType, purpose: ChallengePurpose, userId?: string): Promise<{ code: string } & SendResult> {
    const normalizedPhone = normalizeE164(phone);

    // Rate limit: max envios por telefone por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.phone_challenges.count({
      where: { phone: normalizedPhone, purpose, created_at: { gte: oneHourAgo } },
    });

    if (recentCount >= OTP_SEND_LIMIT_PER_HOUR) {
      return { success: false, code: '', error: 'Muitas solicitações. Tente novamente em 1 hora.' };
    }

    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);

    await prisma.phone_challenges.create({
      data: {
        phone: normalizedPhone,
        user_type: userType,
        user_id: userId || null,
        purpose,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
      },
    });

    return { success: true, code };
  },

  /**
   * Verifica código OTP. Uso único, max tentativas, expiração.
   */
  async verify(phone: string, code: string, purpose: ChallengePurpose): Promise<VerifyResult> {
    const normalizedPhone = normalizeE164(phone);

    // Buscar challenge mais recente ativo
    const challenge = await prisma.phone_challenges.findFirst({
      where: {
        phone: normalizedPhone,
        purpose,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!challenge || challenge.attempts >= challenge.max_attempts) {
      return { success: false, error: 'Código expirado ou inválido. Solicite um novo.' };
    }

    const isValid = await bcrypt.compare(code, challenge.code_hash);

    if (!isValid) {
      // Incrementar tentativas
      await prisma.phone_challenges.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = challenge.max_attempts - challenge.attempts - 1;
      return { success: false, error: `Código incorreto. ${remaining > 0 ? `${remaining} tentativa(s) restante(s).` : 'Solicite um novo código.'}` };
    }

    // Marcar como usado
    await prisma.phone_challenges.update({
      where: { id: challenge.id },
      data: { used_at: new Date() },
    });

    return {
      success: true,
      userId: challenge.user_id || undefined,
      userType: challenge.user_type as ChallengeUserType,
    };
  },
};
