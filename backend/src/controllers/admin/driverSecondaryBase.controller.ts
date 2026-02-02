import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

// GET /api/admin/drivers/:driverId/secondary-base
export const getSecondaryBase = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        secondary_base_lat: true,
        secondary_base_lng: true,
        secondary_base_label: true,
        secondary_base_enabled: true,
        updated_at: true
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    const secondaryBase = driver.secondary_base_lat && driver.secondary_base_lng ? {
      lat: parseFloat(driver.secondary_base_lat.toString()),
      lng: parseFloat(driver.secondary_base_lng.toString()),
      label: driver.secondary_base_label,
      enabled: driver.secondary_base_enabled
    } : null;

    res.json({
      success: true,
      driverId: driver.id,
      secondaryBase,
      updatedAt: driver.updated_at
    });
  } catch (error) {
    console.error('Error fetching secondary base:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar base secundária' });
  }
};

// PUT /api/admin/drivers/:driverId/secondary-base
export const updateSecondaryBase = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { lat, lng, label, enabled } = req.body;

    // Validation
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: lat, lng'
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

    // Get before state
    const before = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        secondary_base_lat: true,
        secondary_base_lng: true,
        secondary_base_label: true,
        secondary_base_enabled: true
      }
    });

    if (!before) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    // Update
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        secondary_base_lat: lat,
        secondary_base_lng: lng,
        secondary_base_label: label || null,
        secondary_base_enabled: enabled !== undefined ? enabled : true,
        updated_at: new Date()
      }
    });

    // Audit log
    console.log(JSON.stringify({
      action: 'driver_secondary_base_update',
      adminId: (req as any).admin?.userId,
      driverId,
      before: {
        lat: before.secondary_base_lat ? parseFloat(before.secondary_base_lat.toString()) : null,
        lng: before.secondary_base_lng ? parseFloat(before.secondary_base_lng.toString()) : null,
        label: before.secondary_base_label,
        enabled: before.secondary_base_enabled
      },
      after: { lat, lng, label, enabled: enabled !== undefined ? enabled : true },
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    res.json({
      success: true,
      driverId,
      before: {
        lat: before.secondary_base_lat ? parseFloat(before.secondary_base_lat.toString()) : null,
        lng: before.secondary_base_lng ? parseFloat(before.secondary_base_lng.toString()) : null,
        label: before.secondary_base_label,
        enabled: before.secondary_base_enabled
      },
      after: { lat, lng, label, enabled: enabled !== undefined ? enabled : true }
    });
  } catch (error) {
    console.error('Error updating secondary base:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar base secundária' });
  }
};

// DELETE /api/admin/drivers/:driverId/secondary-base
export const deleteSecondaryBase = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const before = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        secondary_base_lat: true,
        secondary_base_lng: true,
        secondary_base_label: true,
        secondary_base_enabled: true
      }
    });

    if (!before) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        secondary_base_lat: null,
        secondary_base_lng: null,
        secondary_base_label: null,
        secondary_base_enabled: false,
        updated_at: new Date()
      }
    });

    // Audit log
    console.log(JSON.stringify({
      action: 'driver_secondary_base_delete',
      adminId: (req as any).admin?.userId,
      driverId,
      before: {
        lat: before.secondary_base_lat ? parseFloat(before.secondary_base_lat.toString()) : null,
        lng: before.secondary_base_lng ? parseFloat(before.secondary_base_lng.toString()) : null,
        label: before.secondary_base_label,
        enabled: before.secondary_base_enabled
      },
      after: { lat: null, lng: null, label: null, enabled: false },
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    }));

    res.json({
      success: true,
      driverId,
      before: {
        lat: before.secondary_base_lat ? parseFloat(before.secondary_base_lat.toString()) : null,
        lng: before.secondary_base_lng ? parseFloat(before.secondary_base_lng.toString()) : null,
        label: before.secondary_base_label,
        enabled: before.secondary_base_enabled
      },
      after: { lat: null, lng: null, label: null, enabled: false }
    });
  } catch (error) {
    console.error('Error deleting secondary base:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover base secundária' });
  }
};
