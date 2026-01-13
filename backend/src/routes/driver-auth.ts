import { Router } from 'express';
import { prisma } from '../config/database';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const driverLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

router.post('/driver/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuração inválida' });
    }

    const { email, password } = driverLoginSchema.parse(req.body);

    const driver = await prisma.drivers.findUnique({ where: { email } });

    if (!driver || driver.status !== 'approved' || !driver.password_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValid = await bcrypt.compare(password, driver.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: driver.id, userType: 'DRIVER', email: driver.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        user_type: 'DRIVER'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(400).json({ error: 'Erro no login' });
  }
});

export { router as driverAuthRoutes };
