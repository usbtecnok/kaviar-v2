import { Request, Response } from 'express';
import { AuthService } from './service';
import { loginSchema } from './schemas';

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
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação',
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
