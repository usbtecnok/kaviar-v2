import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { config } from '../config';
import { passwordResetRateLimit } from '../middlewares/auth-rate-limit';

const router = Router();

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

// Generate reset token (JWT with short expiration)
const generateResetToken = (userId: string, userType: string) => {
  return jwt.sign(
    { userId, userType, type: 'password_reset' },
    config.jwtSecret,
    { expiresIn: '15m' } // 15 minutes only
  );
};

// Forgot Password - Generic endpoint
router.post('/forgot-password', passwordResetRateLimit, async (req, res) => {
  try {
    const { email, userType } = forgotPasswordSchema.parse(req.body);

    let user = null;
    let userModel = null;

    // Find user based on type
    switch (userType) {
      case 'admin':
        user = await prisma.admin.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        userModel = 'admin';
        break;
      case 'driver':
        user = await prisma.driver.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        userModel = 'driver';
        break;
      case 'passenger':
        user = await prisma.passenger.findUnique({
          where: { email },
          select: { id: true, email: true, name: true }
        });
        userModel = 'passenger';
        break;
    }

    // SECURITY: Always return success to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
    };

    // If user doesn't exist, still return success (security)
    if (!user) {
      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = generateResetToken(user.id, userType);

    // TODO: Send email with reset link
    // For now, we'll log the token (REMOVE IN PRODUCTION)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset URL: http://localhost:5173/reset-password?token=${resetToken}`);

    // In production, you would:
    // 1. Store the token in database with expiration
    // 2. Send email with reset link
    // 3. Never log the token

    res.json(successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as any;
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }

    // Validate token type
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Token inválido'
      });
    }

    const { userId, userType } = decoded;

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password based on user type
    let updatedUser = null;
    switch (userType) {
      case 'admin':
        updatedUser = await prisma.admin.update({
          where: { id: userId },
          data: { passwordHash },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'driver':
        updatedUser = await prisma.driver.update({
          where: { id: userId },
          data: { passwordHash },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'passenger':
        updatedUser = await prisma.passenger.update({
          where: { id: userId },
          data: { passwordHash },
          select: { id: true, email: true, name: true }
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Tipo de usuário inválido'
        });
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export { router as passwordResetRoutes };
