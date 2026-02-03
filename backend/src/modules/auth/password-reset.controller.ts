import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { emailService } from '../../services/email.service';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

// Rate limiting map (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(email);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

export class PasswordResetController {
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      // Rate limiting
      if (!checkRateLimit(email)) {
        // Always return 200 to prevent email enumeration
        return res.json({
          success: true,
          message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
        });
      }

      // Check if admin exists
      const admin = await prisma.admins.findUnique({
        where: { email },
      });

      // Always return 200 to prevent email enumeration
      if (!admin || !admin.is_active) {
        return res.json({
          success: true,
          message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
        });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save hashed token to database
      await prisma.admins.update({
        where: { id: admin.id },
        data: {
          reset_token: hashedToken,
          reset_token_expires_at: expiresAt,
          updated_at: new Date(),
        },
      });

      // Send email (don't await to prevent timing attacks)
      emailService.sendPasswordResetEmail(email, token).catch((error) => {
        console.error('Failed to send password reset email');
        // Don't expose error to client
      });

      return res.json({
        success: true,
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido',
        });
      }

      console.error('Error in forgotPassword');
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar solicitação',
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      // Hash the token to compare with database
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find admin with valid token
      const admin = await prisma.admins.findFirst({
        where: {
          reset_token: hashedToken,
          reset_token_expires_at: {
            gt: new Date(),
          },
          is_active: true,
        },
      });

      if (!admin) {
        return res.status(400).json({
          success: false,
          error: 'Token inválido ou expirado',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and invalidate token
      await prisma.admins.update({
        where: { id: admin.id },
        data: {
          password: hashedPassword,
          reset_token: null,
          reset_token_expires_at: null,
          must_change_password: false,
          password_changed_at: new Date(),
          updated_at: new Date(),
        },
      });

      return res.json({
        success: true,
        message: 'Senha redefinida com sucesso',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos. A senha deve ter no mínimo 8 caracteres.',
        });
      }

      console.error('Error in resetPassword');
      return res.status(500).json({
        success: false,
        error: 'Erro ao redefinir senha',
      });
    }
  }
}

export const passwordResetController = new PasswordResetController();
