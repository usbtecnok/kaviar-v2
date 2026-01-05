import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { LoginRequest } from './schemas';

export class AuthService {
  async login(data: LoginRequest) {
    const { email, password } = data;

    // Find admin with role
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!admin || !admin.isActive) {
      throw new Error('Credenciais inválidas');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    // Generate JWT
    const secret = config.jwtSecret;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role.name,
      },
      secret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role.name,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  verifyToken(token: string) {
    return jwt.verify(token, config.jwt.secret);
  }
}
