import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

// GET /api/admin/passengers/:passengerId/favorites
export const getFavorites = async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;

    const favorites = await prisma.passenger_favorite_locations.findMany({
      where: { passenger_id: passengerId },
      orderBy: [
        { type: 'asc' }, // HOME first, then WORK, then OTHER
        { created_at: 'asc' }
      ]
    });

    res.json({
      success: true,
      passengerId,
      favorites: favorites.map(f => ({
        id: f.id,
        label: f.label,
        type: f.type,
        lat: parseFloat(f.lat.toString()),
        lng: parseFloat(f.lng.toString()),
        createdAt: f.created_at,
        updatedAt: f.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar favoritos' });
  }
};

// PUT /api/admin/passengers/:passengerId/favorites
export const upsertFavorite = async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;
    const { id, label, type, lat, lng } = req.body;

    // Validation
    if (!label || !type || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: label, type, lat, lng'
      });
    }

    if (!['HOME', 'WORK', 'OTHER'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo inválido. Use: HOME, WORK ou OTHER'
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Coordenadas inválidas. Lat: -90 a 90, Lng: -180 a 180'
      });
    }

    // Check max 3 favorites
    const existingCount = await prisma.passenger_favorite_locations.count({
      where: { 
        passenger_id: passengerId,
        ...(id ? { id: { not: id } } : {})
      }
    });

    if (!id && existingCount >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Máximo de 3 favoritos por passageiro'
      });
    }

    // Get before state for audit
    const before = id ? await prisma.passenger_favorite_locations.findUnique({
      where: { id }
    }) : null;

    // Upsert
    const favorite = await prisma.passenger_favorite_locations.upsert({
      where: { id: id || 'new' },
      update: { label, type, lat, lng, updated_at: new Date() },
      create: {
        passenger_id: passengerId,
        label,
        type,
        lat,
        lng
      }
    });

    // Audit log
    console.log(JSON.stringify({
      action: 'passenger_favorite_upsert',
      adminId: (req as any).admin?.userId,
      passengerId,
      favoriteId: favorite.id,
      before: before ? { label: before.label, type: before.type, lat: parseFloat(before.lat.toString()), lng: parseFloat(before.lng.toString()) } : null,
      after: { label, type, lat, lng },
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    res.json({
      success: true,
      favorite: {
        id: favorite.id,
        label: favorite.label,
        type: favorite.type,
        lat: parseFloat(favorite.lat.toString()),
        lng: parseFloat(favorite.lng.toString())
      }
    });
  } catch (error) {
    console.error('Error upserting favorite:', error);
    res.status(500).json({ success: false, error: 'Erro ao salvar favorito' });
  }
};

// DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
export const deleteFavorite = async (req: Request, res: Response) => {
  try {
    const { passengerId, favoriteId } = req.params;

    const favorite = await prisma.passenger_favorite_locations.findUnique({
      where: { id: favoriteId }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: 'Favorito não encontrado'
      });
    }

    // Prevent deleting HOME if it's the only one (optional rule)
    if (favorite.type === 'HOME') {
      const homeCount = await prisma.passenger_favorite_locations.count({
        where: { passenger_id: passengerId, type: 'HOME' }
      });

      if (homeCount === 1) {
        return res.status(400).json({
          success: false,
          error: 'HOME é obrigatório. Crie outro HOME antes de remover este.'
        });
      }
    }

    await prisma.passenger_favorite_locations.delete({
      where: { id: favoriteId }
    });

    // Audit log
    console.log(JSON.stringify({
      action: 'passenger_favorite_delete',
      adminId: (req as any).admin?.userId,
      passengerId,
      favoriteId,
      before: { label: favorite.label, type: favorite.type, lat: parseFloat(favorite.lat.toString()), lng: parseFloat(favorite.lng.toString()) },
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    res.json({ success: true, message: 'Favorito removido com sucesso' });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover favorito' });
  }
};
