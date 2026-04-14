import { Router } from 'express';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { passwordResetRateLimit } from '../middlewares/auth-rate-limit';
import { emailService } from '../services/email/email.service';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit for the reset-password endpoint (by IP)
const resetExecutionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});

// Validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  userType: z.enum(['admin', 'driver', 'passenger'], {
    errorMap: () => ({ message: 'Tipo de usuário inválido' })
  })
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

// Generate reset token with SEPARATE secret
const generateResetToken = (userId: string, userType: string) => {
  return jwt.sign(
    { userId, userType, purpose: 'password_reset' },
    config.jwtResetSecret,
    { expiresIn: '15m' }
  );
};

// Lookup user and their password_changed_at across all user types
async function findUser(userType: string, userId: string) {
  switch (userType) {
    case 'admin':
      return prisma.admins.findUnique({
        where: { id: userId },
        select: { id: true, password_changed_at: true }
      });
    case 'driver':
      return prisma.drivers.findUnique({
        where: { id: userId },
        select: { id: true, password_changed_at: true }
      });
    case 'passenger':
      return prisma.passengers.findUnique({
        where: { id: userId },
        select: { id: true, password_changed_at: true }
      });
    default:
      return null;
  }
}

// Forgot Password
router.post('/forgot-password', passwordResetRateLimit, async (req, res) => {
  try {
    const { email, userType } = forgotPasswordSchema.parse(req.body);

    // SECURITY: Always return same response regardless of account existence
    const successResponse = {
      success: true,
      message: 'Se a conta existir, enviaremos as instruções para redefinição.'
    };

    let user: { id: string; email: string; name: string } | null = null;

    switch (userType) {
      case 'admin':
        user = await prisma.admins.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'driver':
        user = await prisma.drivers.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'passenger':
        user = await prisma.passengers.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        break;
    }

    if (!user) {
      return res.json(successResponse);
    }

    const resetToken = generateResetToken(user.id, userType);
    const resetUrl = `${config.frontendUrl}/admin/reset-password?token=${resetToken}`;

    await emailService.sendMail({
      to: user.email,
      subject: 'KAVIAR - Redefinição de Senha',
      html: `
        <h2>Redefinição de Senha</h2>
        <p>Olá ${user.name},</p>
        <p>Você solicitou a redefinição de senha. Clique no link abaixo para continuar:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Este link expira em 15 minutos.</p>
        <p>Se você não solicitou esta redefinição, ignore este email.</p>
      `,
      text: `Olá ${user.name},\n\nVocê solicitou a redefinição de senha.\n\nAcesse: ${resetUrl}\n\nEste link expira em 15 minutos.\n\nSe você não solicitou esta redefinição, ignore este email.`
    });

    res.json(successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Forgot password error (no sensitive data logged)');
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Reset Password
router.post('/reset-password', resetExecutionRateLimit, async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Verify with SEPARATE reset secret
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtResetSecret);
    } catch {
      return res.status(400).json({ success: false, error: 'Token inválido ou expirado' });
    }

    // Validate token purpose explicitly
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    const { userId, userType } = decoded;
    const tokenIssuedAt = decoded.iat; // Unix seconds

    // Find user and check if token was already used (password changed after token issued)
    const user = await findUser(userType, userId);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    if (user.password_changed_at) {
      // Add 2s tolerance for clock skew
      const changedAtUnix = Math.floor(user.password_changed_at.getTime() / 1000);
      if (changedAtUnix >= tokenIssuedAt - 2) {
        return res.status(400).json({ success: false, error: 'Token já utilizado' });
      }
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    // Update password + password_changed_at (invalidates this token and all active sessions)
    switch (userType) {
      case 'admin':
        await prisma.admins.update({
          where: { id: userId },
          data: { password: passwordHash, must_change_password: false, password_changed_at: now, updated_at: now }
        });
        break;
      case 'driver':
        await prisma.drivers.update({
          where: { id: userId },
          data: { password_hash: passwordHash, password_changed_at: now, updated_at: now }
        });
        break;
      case 'passenger':
        await prisma.passengers.update({
          where: { id: userId },
          data: { password_hash: passwordHash, password_changed_at: now, updated_at: now }
        });
        break;
      default:
        return res.status(400).json({ success: false, error: 'Tipo de usuário inválido' });
    }

    // NO auto-login. User must authenticate normally after reset.
    res.json({
      success: true,
      message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
      userType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Reset password error (no sensitive data logged)');
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export { router as passwordResetRoutes };
