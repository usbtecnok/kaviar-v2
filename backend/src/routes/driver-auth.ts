import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = Router();

const driverLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const driverSetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

router.post('/driver/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuração inválida' });
    }

    const { email, password } = driverLoginSchema.parse(req.body);

    const driver = await prisma.drivers.findUnique({ where: { email } });

    if (!driver || !driver.password_hash) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValid = await bcrypt.compare(password, driver.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // ✅ MODO KAVIAR: Autenticação permite pending, autorização restringe funcionalidades
    // Apenas bloqueia rejected/suspended
    if (['rejected', 'suspended'].includes(driver.status)) {
      return res.status(403).json({ error: 'Conta suspensa ou rejeitada' });
    }

    const token = jwt.sign(
      { 
        userId: driver.id, 
        userType: 'DRIVER', 
        email: driver.email,
        status: driver.status // ✅ JWT carrega status
      },
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
        user_type: 'DRIVER',
        isPending: driver.status === 'pending' // ✅ Flag para frontend
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(400).json({ error: 'Erro no login' });
  }
});

router.post('/driver/set-password', async (req, res) => {
  try {
    const { email, password } = driverSetPasswordSchema.parse(req.body);

    const driver = await prisma.drivers.findUnique({ where: { email } });

    if (!driver) {
      // Segurança: não revelar se email existe
      return res.json({ success: true, message: 'Se o email existir, a senha será atualizada' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await prisma.drivers.update({
      where: { email },
      data: { password_hash }
    });

    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: 'Erro ao atualizar senha' });
  }
});

export { router as driverAuthRoutes };
