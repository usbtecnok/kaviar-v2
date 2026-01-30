import { Request, Response } from 'express';
import { AuthService } from './service';
import { loginSchema } from './schemas';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

export class AuthController {
  private authService = new AuthService();

  login = async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Authenticate admin
      const result = await this.authService.login(validatedData.email, validatedData.password);

      res.json({
        success: true,
        token: result.token, // Root level for compatibility
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação',
      });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const userId = (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Não autenticado',
        });
      }

      await this.authService.changePassword(
        userId,
        validatedData.currentPassword,
        validatedData.newPassword
      );

      res.json({
        success: true,
        message: 'Senha alterada com sucesso',
      });
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
