import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/drivers/:driverId/virtual-fence-center
 * Busca o centro virtual atual do motorista
 */
export async function getVirtualFenceCenter(req: Request, res: Response) {
  try {
    const { driverId } = req.params;

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        updated_at: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    // Always return null for virtual fence center (columns don't exist in prod DB)
    return res.json({
      success: true,
      driverId: driver.id,
      virtualFenceCenter: null,
      updatedAt: driver.updated_at
    });
  } catch (error) {
    console.error('Erro ao buscar centro virtual:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar centro virtual'
    });
  }
}

/**
 * PUT /api/admin/drivers/:driverId/virtual-fence-center
 * Define/atualiza o centro virtual do motorista
 */
export async function updateVirtualFenceCenter(req: Request, res: Response) {
  try {
    const { driverId } = req.params;
    const { lat, lng } = req.body;
    const admin = (req as any).admin;

    // Validação de coordenadas
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Coordenadas inválidas: lat e lng devem ser números'
      });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude inválida: deve estar entre -90 e 90'
      });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude inválida: deve estar entre -180 e 180'
      });
    }

    // Buscar driver
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    // P2022: Columns don't exist - return success with warning
    return res.json({
      success: true,
      data: { lat: null, lng: null },
      warning: 'DB sem virtual fence center (colunas não provisionadas)'
    });
  } catch (error) {
    console.error('Erro ao atualizar centro virtual:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar centro virtual'
    });
  }
}

/**
 * DELETE /api/admin/drivers/:driverId/virtual-fence-center
 * Remove o centro virtual do motorista
 */
export async function deleteVirtualFenceCenter(req: Request, res: Response) {
  try {
    const { driverId } = req.params;
    const admin = (req as any).admin;

    // Buscar driver
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    // P2022: Columns don't exist - return success
    return res.json({
      success: true,
      driverId,
      before: { lat: null, lng: null },
      after: { lat: null, lng: null }
    });
  } catch (error) {
    console.error('Erro ao remover centro virtual:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao remover centro virtual'
    });
  }
}
