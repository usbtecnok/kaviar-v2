import { prisma } from '../../config/database';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

export class AuthService {
  private readonly ALLOWED_ADMIN_EMAILS = [
    'suporte@usbtecnok.com.br',
    'financeiro@usbtecnok.com.br'
  ];

  async login(email: string, password: string) {
    // Whitelist check
    if (!this.ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase())) {
      throw new Error('Acesso não autorizado');
    }

    // Find admin user
    const admin = await prisma.admins.findUnique({
      where: { email }
    });

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: admin.id, 
        userType: 'ADMIN',
        email: admin.email 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role_id
      }
    };
  }
}
