import { Router } from 'express';
import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { driverRegistrationService } from '../services/driver-registration.service';

const router = Router();

const driverLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const driverSetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

const driverRegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  document_cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos'),
  accepted_terms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  }),
  vehicle_color: z.string().min(2, 'Cor do veículo é obrigatória'),
  vehicle_model: z.string().optional(),
  vehicle_plate: z.string().optional(),
  neighborhoodId: z.string().min(1, 'Bairro é obrigatório'),
  communityId: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  verificationMethod: z.enum(['GPS_AUTO', 'MANUAL_SELECTION']).optional(),
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.enum(['individual', 'familiar']).optional()
});

// POST /api/auth/driver/register - Cadastro público (sem token)
router.post('/driver/register', async (req, res) => {
  try {
    const data = driverRegisterSchema.parse(req.body);

    // Chamar service única
    const result = await driverRegistrationService.register({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      document_cpf: data.document_cpf,
      vehicle_color: data.vehicle_color,
      vehicle_model: data.vehicle_model,
      vehicle_plate: data.vehicle_plate,
      accepted_terms: data.accepted_terms,
      neighborhoodId: data.neighborhoodId,
      communityId: data.communityId,
      lat: data.lat,
      lng: data.lng,
      verificationMethod: data.verificationMethod,
      familyBonusAccepted: data.familyBonusAccepted,
      familyProfile: data.familyProfile,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || undefined
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      token: result.token,
      user: {
        id: result.driver!.id,
        name: result.driver!.name,
        email: result.driver!.email,
        phone: result.driver!.phone,
        status: result.driver!.status,
        user_type: 'DRIVER',
        isPending: result.driver!.isPending
      }
    });
  } catch (error) {
    console.error('Error in driver register:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao cadastrar motorista'
    });
  }
});

router.post('/driver/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Configuração inválida' });
    }

    const { email, password } = driverLoginSchema.parse(req.body);

    console.log(`[LOGIN] Tentativa de login: ${email}`);

    const driver = await prisma.drivers.findUnique({ where: { email } });

    if (!driver || !driver.password_hash) {
      console.log(`[LOGIN] Driver não encontrado ou sem password_hash: ${email}`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log(`[LOGIN] Driver encontrado: ${driver.id}, status: ${driver.status}`);
    console.log(`[LOGIN] Hash no banco: ${driver.password_hash.substring(0, 20)}...`);

    const isValid = await bcrypt.compare(password, driver.password_hash);
    console.log(`[LOGIN] bcrypt.compare result: ${isValid}`);

    if (!isValid) {
      console.log(`[LOGIN] Senha inválida para: ${email}`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // ✅ MODO KAVIAR: Autenticação permite pending, autorização restringe funcionalidades
    // Apenas bloqueia rejected/suspended
    if (['rejected', 'suspended'].includes(driver.status)) {
      console.log(`[LOGIN] Status bloqueado: ${driver.status}`);
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

    console.log(`[LOGIN] Login bem-sucedido: ${email}`);

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
    console.error('[LOGIN] Erro:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    res.status(400).json({ error: 'Erro no login' });
  }
});

router.post('/driver/set-password', async (req, res) => {
  try {
    const { email, password } = driverSetPasswordSchema.parse(req.body);
    console.log(`[SET-PASSWORD] Email: ${email}, Senha recebida: ${password.substring(0, 3)}...`);

    const driver = await prisma.drivers.findUnique({ where: { email } });

    if (!driver) {
      console.log(`[SET-PASSWORD] Driver não encontrado: ${email}`);
      return res.json({ success: true, message: 'Se o email existir, a senha será atualizada' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    console.log(`[SET-PASSWORD] Novo hash gerado: ${password_hash.substring(0, 20)}...`);

    await prisma.drivers.update({
      where: { email },
      data: { password_hash }
    });

    console.log(`[SET-PASSWORD] Hash atualizado no banco para: ${email}`);
    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.log(`[SET-PASSWORD] Erro:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(400).json({ error: 'Erro ao atualizar senha' });
  }
});

// POST /api/auth/driver/location - Envio de localização (autenticado)
router.post('/driver/location', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    if (decoded.userType !== 'DRIVER') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    // Atualizar última localização do motorista
    await prisma.drivers.update({
      where: { id: decoded.userId },
      data: {
        last_lat: lat,
        last_lng: lng,
        last_location_updated_at: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Erro ao atualizar localização' });
  }
});

export { router as driverAuthRoutes };
