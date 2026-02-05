import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { clearFeatureFlagCache } from '../../services/feature-flag.service';

// GET /api/admin/feature-flags/:key
export const getFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const flag = await prisma.feature_flags.findUnique({
      where: { key },
      select: {
        key: true,
        enabled: true,
        rollout_percentage: true,
        updated_by_admin_id: true,
        updated_at: true,
        created_at: true,
      },
    });

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Feature flag não encontrada',
      });
    }

    res.json({
      success: true,
      flag: {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPercentage: flag.rollout_percentage,
        updatedByAdminId: flag.updated_by_admin_id,
        updatedAt: flag.updated_at,
        createdAt: flag.created_at,
      },
    });
  } catch (error: any) {
    // P2021: Table doesn't exist - return fallback
    if (error?.code === 'P2021') {
      return res.json({
        success: true,
        flag: {
          key: req.params.key,
          enabled: false,
          rolloutPercentage: 0,
          updatedByAdminId: null,
          updatedAt: null,
          createdAt: null,
        },
      });
    }
    console.error('Error fetching feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar feature flag',
    });
  }
};

// PUT /api/admin/feature-flags/:key
export const updateFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled, rolloutPercentage } = req.body;
    const adminId = (req as any).admin?.userId;

    // Validation
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Campo "enabled" deve ser boolean',
      });
    }

    if (
      typeof rolloutPercentage !== 'number' ||
      rolloutPercentage < 0 ||
      rolloutPercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        error: 'Campo "rolloutPercentage" deve ser número entre 0 e 100',
      });
    }

    // Get before state for audit
    const before = await prisma.feature_flags.findUnique({
      where: { key },
    });

    // Update
    const flag = await prisma.feature_flags.upsert({
      where: { key },
      update: {
        enabled,
        rollout_percentage: rolloutPercentage,
        updated_by_admin_id: adminId,
        updated_at: new Date(),
      },
      create: {
        key,
        enabled,
        rollout_percentage: rolloutPercentage,
        updated_by_admin_id: adminId,
      },
    });

    // Clear cache to apply changes immediately
    clearFeatureFlagCache();

    // Audit log
    console.log(
      JSON.stringify({
        action: 'feature_flag_update',
        adminId,
        key,
        before: before
          ? {
              enabled: before.enabled,
              rolloutPercentage: before.rollout_percentage,
            }
          : null,
        after: { enabled, rolloutPercentage },
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    );

    res.json({
      success: true,
      flag: {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPercentage: flag.rollout_percentage,
        updatedAt: flag.updated_at,
      },
    });
  } catch (error: any) {
    // P2021: Table doesn't exist - return 501
    if (error?.code === 'P2021') {
      return res.status(501).json({
        success: false,
        error: 'Feature flags ainda não provisionadas no banco (migration pendente).',
      });
    }
    console.error('Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar feature flag',
    });
  }
};

// GET /api/admin/feature-flags/:key/allowlist
export const getAllowlist = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.feature_flag_allowlist.findMany({
        where: { key },
        select: {
          id: true,
          passenger_id: true,
          created_by_admin_id: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip,
      }),
      prisma.feature_flag_allowlist.count({ where: { key } }),
    ]);

    res.json({
      success: true,
      allowlist: entries.map((e) => ({
        id: e.id,
        passengerId: e.passenger_id,
        createdByAdminId: e.created_by_admin_id,
        createdAt: e.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    // P2021: Table doesn't exist - return empty list
    if (error?.code === 'P2021') {
      return res.json({
        success: true,
        allowlist: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
    }
    console.error('Error fetching allowlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar allowlist',
    });
  }
};

// POST /api/admin/feature-flags/:key/allowlist
export const addToAllowlist = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { passengerId } = req.body;
    const adminId = (req as any).admin?.userId;

    if (!passengerId || typeof passengerId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Campo "passengerId" é obrigatório',
      });
    }

    // Check if already exists
    const existing = await prisma.feature_flag_allowlist.findUnique({
      where: {
        key_passenger_id: {
          key,
          passenger_id: passengerId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Passenger já está na allowlist',
      });
    }

    // Add to allowlist
    const entry = await prisma.feature_flag_allowlist.create({
      data: {
        key,
        passenger_id: passengerId,
        created_by_admin_id: adminId,
      },
    });

    // Audit log
    console.log(
      JSON.stringify({
        action: 'feature_flag_allowlist_add',
        adminId,
        key,
        passengerId,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    );

    res.json({
      success: true,
      entry: {
        id: entry.id,
        passengerId: entry.passenger_id,
        createdAt: entry.created_at,
      },
    });
  } catch (error: any) {
    // P2021: Table doesn't exist - return 501
    if (error?.code === 'P2021') {
      return res.status(501).json({
        success: false,
        error: 'Feature flags ainda não provisionadas no banco (migration pendente).',
      });
    }
    console.error('Error adding to allowlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao adicionar à allowlist',
    });
  }
};

// DELETE /api/admin/feature-flags/:key/allowlist/:passengerId
export const removeFromAllowlist = async (req: Request, res: Response) => {
  try {
    const { key, passengerId } = req.params;
    const adminId = (req as any).admin?.userId;

    const entry = await prisma.feature_flag_allowlist.findUnique({
      where: {
        key_passenger_id: {
          key,
          passenger_id: passengerId,
        },
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Passenger não encontrado na allowlist',
      });
    }

    await prisma.feature_flag_allowlist.delete({
      where: {
        key_passenger_id: {
          key,
          passenger_id: passengerId,
        },
      },
    });

    // Audit log
    console.log(
      JSON.stringify({
        action: 'feature_flag_allowlist_remove',
        adminId,
        key,
        passengerId,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    );

    res.json({
      success: true,
      message: 'Passenger removido da allowlist',
    });
  } catch (error: any) {
    // P2021: Table doesn't exist - return 501
    if (error?.code === 'P2021') {
      return res.status(501).json({
        success: false,
        error: 'Feature flags ainda não provisionadas no banco (migration pendente).',
      });
    }
    console.error('Error removing from allowlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover da allowlist',
    });
  }
};
