import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createCommunitySchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  isActive: z.boolean().optional().default(true)
});

export const createCommunity = async (req: Request, res: Response) => {
  try {
    const { name, isActive } = createCommunitySchema.parse(req.body);

    // Verificar duplicado (case-insensitive)
    const existing = await prisma.community.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bairro já existe'
      });
    }

    // Criar nova comunidade
    const community = await prisma.community.create({
      data: {
        name: name.trim(),
        isActive: isActive ?? true
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true,
        geofence: true,
        createdAt: true
      }
    });

    console.log(`✅ Community created: ${community.name}`);

    res.status(201).json({
      success: true,
      data: community,
      message: 'Bairro criado com sucesso'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Dados inválidos'
      });
    }

    console.error('❌ Error creating community:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
