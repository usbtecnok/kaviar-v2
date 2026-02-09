import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticatePassenger } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const VALID_TYPES = ['HOME', 'WORK', 'OTHER'] as const;
type FavoriteType = typeof VALID_TYPES[number];

// POST /api/passenger/favorites (UPSERT by passenger_id + type)
router.post('/favorites', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const { type, label, lat, lng, address_text, place_source } = req.body;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    // Validate required fields
    if (!label || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, label, lat, lng',
      });
    }

    // Check if already exists for this type
    const existing = await prisma.passenger_favorite_locations.findFirst({
      where: {
        passenger_id: passenger.id,
        type,
      },
    });

    // If doesn't exist, check limit of 3
    if (!existing) {
      const count = await prisma.passenger_favorite_locations.count({
        where: { passenger_id: passenger.id },
      });

      if (count >= 3) {
        return res.status(400).json({
          success: false,
          error: 'Limite de 3 locais atingido. Delete um para adicionar outro.',
        });
      }
    }

    // UPSERT: update if exists, create if not
    const favorite = await prisma.passenger_favorite_locations.upsert({
      where: {
        passenger_id_type: {
          passenger_id: passenger.id,
          type,
        },
      },
      update: {
        label,
        lat,
        lng,
        address_text: address_text || null,
        place_source: place_source || 'manual',
        updated_at: new Date(),
      },
      create: {
        passenger_id: passenger.id,
        type,
        label,
        lat,
        lng,
        address_text: address_text || null,
        place_source: place_source || 'manual',
      },
    });

    console.log(`[favorites] ${existing ? 'Updated' : 'Created'} type=${type} passenger=***`);

    res.status(existing ? 200 : 201).json({
      success: true,
      data: {
        id: favorite.id,
        type: favorite.type,
        label: favorite.label,
        lat: Number(favorite.lat),
        lng: Number(favorite.lng),
        address_text: favorite.address_text,
        place_source: favorite.place_source,
        updated_at: favorite.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[favorites] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar local favorito',
    });
  }
});

// GET /api/passenger/favorites
router.get('/favorites', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;

    const favorites = await prisma.passenger_favorite_locations.findMany({
      where: { passenger_id: passenger.id },
      orderBy: [
        { type: 'asc' }, // HOME, WORK, OTHER
        { created_at: 'desc' },
      ],
    });

    console.log(`[favorites] Listed count=${favorites.length} passenger=***`);

    res.json({
      success: true,
      data: favorites.map(f => ({
        id: f.id,
        type: f.type,
        label: f.label,
        lat: Number(f.lat),
        lng: Number(f.lng),
        address_text: f.address_text,
        place_source: f.place_source,
        created_at: f.created_at,
        updated_at: f.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('[favorites] Error listing:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar locais favoritos',
    });
  }
});

// DELETE /api/passenger/favorites/:id
router.delete('/favorites/:id', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passenger = (req as any).passenger;
    const { id } = req.params;

    // Verify ownership
    const favorite = await prisma.passenger_favorite_locations.findFirst({
      where: {
        id,
        passenger_id: passenger.id,
      },
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: 'Local favorito não encontrado',
      });
    }

    await prisma.passenger_favorite_locations.delete({
      where: { id },
    });

    console.log(`[favorites] Deleted type=${favorite.type} passenger=***`);

    res.json({
      success: true,
      message: 'Local favorito removido',
    });
  } catch (error: any) {
    console.error('[favorites] Error deleting:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover local favorito',
    });
  }
});

export default router;
