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
        virtual_fence_center_lat: true,
        virtual_fence_center_lng: true,
        updated_at: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    const virtualFenceCenter = 
      driver.virtual_fence_center_lat && driver.virtual_fence_center_lng
        ? {
            lat: Number(driver.virtual_fence_center_lat),
            lng: Number(driver.virtual_fence_center_lng)
          }
        : null;

    return res.json({
      success: true,
      driverId: driver.id,
      virtualFenceCenter,
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

    // Buscar estado anterior
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        virtual_fence_center_lat: true,
        virtual_fence_center_lng: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    const before = {
      lat: driver.virtual_fence_center_lat ? Number(driver.virtual_fence_center_lat) : null,
      lng: driver.virtual_fence_center_lng ? Number(driver.virtual_fence_center_lng) : null
    };

    // Atualizar
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        virtual_fence_center_lat: lat,
        virtual_fence_center_lng: lng,
        updated_at: new Date()
      }
    });

    const after = { lat, lng };

    // Auditoria
    console.log(JSON.stringify({
      event: 'VIRTUAL_FENCE_CENTER_UPDATED',
      adminId: admin?.id,
      adminEmail: admin?.email,
      driverId,
      before,
      after,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    return res.json({
      success: true,
      driverId,
      before,
      after
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

    // Buscar estado anterior
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        virtual_fence_center_lat: true,
        virtual_fence_center_lng: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver não encontrado'
      });
    }

    const before = {
      lat: driver.virtual_fence_center_lat ? Number(driver.virtual_fence_center_lat) : null,
      lng: driver.virtual_fence_center_lng ? Number(driver.virtual_fence_center_lng) : null
    };

    // Remover
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        virtual_fence_center_lat: null,
        virtual_fence_center_lng: null,
        updated_at: new Date()
      }
    });

    const after = { lat: null, lng: null };

    // Auditoria
    console.log(JSON.stringify({
      event: 'VIRTUAL_FENCE_CENTER_DELETED',
      adminId: admin?.id,
      adminEmail: admin?.email,
      driverId,
      before,
      after,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    return res.json({
      success: true,
      driverId,
      before,
      after
    });
  } catch (error) {
    console.error('Erro ao remover centro virtual:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao remover centro virtual'
    });
  }
}
