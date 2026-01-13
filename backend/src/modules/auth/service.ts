import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class AuthService {
  async login(email: string, password: string) {
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
