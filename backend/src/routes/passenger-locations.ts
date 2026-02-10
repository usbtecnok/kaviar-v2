import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { resolveTerritory } from '../services/territory-resolver.service';

const router = Router();

/**
 * POST /api/passengers/:passengerId/locations
 * Cadastra endereço frequente do passageiro
 */
router.post('/:passengerId/locations', async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;
    const { type, address, lat, lng, label } = req.body;

    // Validação
    if (!['HOME', 'WORK', 'OTHER'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo deve ser HOME, WORK ou OTHER'
      });
    }

    // Resolver território usando serviço centralizado
    const territory = await resolveTerritory(lng, lat);

    // Criar localização
    const location = await prisma.$executeRaw`
      INSERT INTO passenger_frequent_locations (
        id, passenger_id, location_type, address, lat, lng, 
        neighborhood_id, label, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${passengerId}, ${type}, ${address}, 
        ${lat}, ${lng}, ${territory.neighborhood?.id || null}, 
        ${label || null}, NOW(), NOW()
      )
      ON CONFLICT (passenger_id, location_type) 
      DO UPDATE SET 
        address = ${address},
        lat = ${lat},
        lng = ${lng},
        neighborhood_id = ${territory.neighborhood?.id || null},
        label = ${label || null},
        updated_at = NOW()
    `;

    res.json({
      success: true,
      data: {
        type,
        address,
        neighborhood: territory.neighborhood,
        community: territory.community,
        method: territory.method
      }
    });

  } catch (error: any) {
    console.error('Erro ao salvar localização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar localização'
    });
  }
});

/**
 * GET /api/passengers/:passengerId/locations
 * Lista endereços frequentes do passageiro
 */
router.get('/:passengerId/locations', async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;

    const locations: any[] = await prisma.$queryRaw`
      SELECT 
        pfl.id,
        pfl.location_type,
        pfl.address,
        pfl.lat,
        pfl.lng,
        pfl.label,
        n.id as neighborhood_id,
        n.name as neighborhood_name
      FROM passenger_frequent_locations pfl
      LEFT JOIN neighborhoods n ON n.id = pfl.neighborhood_id
      WHERE pfl.passenger_id = ${passengerId}
      ORDER BY 
        CASE pfl.location_type
          WHEN 'HOME' THEN 1
          WHEN 'WORK' THEN 2
          WHEN 'OTHER' THEN 3
        END
    `;

    res.json({
      success: true,
      data: locations.map(l => ({
        id: l.id,
        type: l.location_type,
        address: l.address,
        lat: Number(l.lat),
        lng: Number(l.lng),
        label: l.label,
        neighborhood: l.neighborhood_id ? {
          id: l.neighborhood_id,
          name: l.neighborhood_name
        } : null
      }))
    });

  } catch (error: any) {
    console.error('Erro ao buscar localizações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar localizações'
    });
  }
});

/**
 * DELETE /api/passengers/:passengerId/locations/:locationId
 * Remove endereço frequente
 */
router.delete('/:passengerId/locations/:locationId', async (req: Request, res: Response) => {
  try {
    const { passengerId, locationId } = req.params;

    await prisma.$executeRaw`
      DELETE FROM passenger_frequent_locations
      WHERE id = ${locationId} AND passenger_id = ${passengerId}
    `;

    res.json({
      success: true,
      message: 'Localização removida'
    });

  } catch (error: any) {
    console.error('Erro ao remover localização:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover localização'
    });
  }
});

export default router;
