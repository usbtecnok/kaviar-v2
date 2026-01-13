import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Schemas
const passengerCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

const passengerLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

const consentSchema = z.object({
  passengerId: z.string(),
  consentType: z.string(),
  accepted: z.boolean(),
  ipAddress: z.string()
});

// POST /api/governance/passenger - Create passenger
router.post('/passenger', async (req, res) => {
  try {
    const data = passengerCreateSchema.parse(req.body);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Create passenger with ACTIVE status (no approval needed)
    const passenger = await prisma.passengers.create({
      data: {
        id: randomUUID(),
        name: data.name,
        email: data.email || '',
        phone: data.phone,
        password_hash: hashedPassword,
        status: 'ACTIVE', // Passengers are immediately active
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      data: { 
        id: passenger.id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
        status: passenger.status
      }
    });
  } catch (error) {
    console.error('Error creating passenger:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar passageiro'
    });
  }
});

// POST /api/governance/consent - Record LGPD consent
router.post('/consent', async (req, res) => {
  try {
    const data = consentSchema.parse(req.body);
    
    await prisma.user_consents.upsert({
      where: {
        passenger_id_consent_type: { 
          passenger_id: data.passengerId, 
          consent_type: data.consentType 
        }
      },
      update: {
        accepted: data.accepted,
        ip_address: data.ipAddress,
        accepted_at: data.accepted ? new Date() : null
      },
      create: {
        id: randomUUID(),
        passenger_id: data.passengerId,
        consent_type: data.consentType,
        accepted: data.accepted,
        ip_address: data.ipAddress,
        accepted_at: data.accepted ? new Date() : null,
        created_at: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar consentimento'
    });
  }
});

// GET /api/governance/communities - List communities
router.get('/communities', async (req, res) => {
  try {
    const communities = await prisma.communities.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({ 
      success: true, 
      data: communities 
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar comunidades'
    });
  }
});

export { router as governanceRoutes };
