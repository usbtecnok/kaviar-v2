import { Request, Response } from 'express';
import { AuthService } from './service';
import { loginSchema } from './schemas';
import { z } from 'zod';
import { auditLogin, audit, auditCtx } from '../../utils/audit';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

export class AuthController {
  private authService = new AuthService();

  login = async (req: Request, res: Response) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ua = (req.headers['user-agent'] || 'unknown').substring(0, 200);
    let email = '';

    try {
      const validatedData = loginSchema.parse(req.body);
      email = validatedData.email;

      const result = await this.authService.login(validatedData.email, validatedData.password);

      auditLogin({ email, adminId: result.user.id, success: true, ipAddress: ip, userAgent: ua });

      res.json({
        success: true,
        token: result.token,
        data: result,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Erro de autenticação';
      auditLogin({ email: email || req.body?.email || 'unknown', success: false, failReason: reason, ipAddress: ip, userAgent: ua });

      res.status(401).json({
        success: false,
        error: reason,
      });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const ctx = auditCtx(req);

      if (!ctx.adminId || ctx.adminId === 'unknown') {
        return res.status(401).json({ success: false, error: 'Não autenticado' });
      }

      await this.authService.changePassword(ctx.adminId, validatedData.currentPassword, validatedData.newPassword);

      audit({ adminId: ctx.adminId, adminEmail: ctx.adminEmail, action: 'change_password', entityType: 'admin', entityId: ctx.adminId, ipAddress: ctx.ip, userAgent: ctx.ua });

      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao alterar senha',
      });
    }
  };

  logout = async (req: Request, res: Response) => {
    // For JWT, logout is handled client-side by removing the token
    res.json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  };
}
