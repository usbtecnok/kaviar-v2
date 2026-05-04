import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LocalSupportDriverData {
  community_id?: string;
  status?: string;
  primary_area?: string;
  coverage_areas?: string[];
  preferred_windows?: any;
  pilot_start_date?: Date;
  operational_notes?: string;
}

export interface LocalSupportInviteData {
  driver_id: string;
  community_id?: string;
  region?: string;
  demand_type?: string;
  responded?: boolean;
  response_time_minutes?: number;
  informed_availability?: boolean;
  attended_ride?: boolean;
  notes?: string;
  invited_by_admin_id?: string;
}

export class LocalSupportService {
  async listDrivers(filters: {
    community_id?: string;
    status?: string;
    limit?: number;
  }) {
    const { community_id, status, limit = 50 } = filters;
    
    return await prisma.local_support_drivers.findMany({
      where: {
        ...(community_id && { community_id }),
        ...(status && { status }),
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          }
        },
        community: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      take: Number(limit),
      orderBy: { created_at: 'desc' }
    });
  }

  async registerDriver(driverId: string, data: LocalSupportDriverData) {
    // Verificar se driver existe
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId }
    });
    
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Criar ou atualizar registro
    return await prisma.local_support_drivers.upsert({
      where: { driver_id: driverId },
      update: {
        ...data,
        updated_at: new Date(),
      },
      create: {
        driver_id: driverId,
        ...data,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        community: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  }

  async updateDriver(driverId: string, data: LocalSupportDriverData) {
    return await prisma.local_support_drivers.update({
      where: { driver_id: driverId },
      data: {
        ...data,
        updated_at: new Date(),
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          }
        },
        community: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  }

  async recordInvite(data: LocalSupportInviteData) {
    return await prisma.local_support_invites.create({
      data,
      include: {
        support_driver: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              }
            }
          }
        },
        community: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  }

  async getSummary(filters: {
    community_id?: string;
    period?: string;
  }) {
    const { community_id } = filters;
    
    // Resumo básico por status
    const statusSummary = await prisma.local_support_drivers.groupBy({
      by: ['status'],
      where: {
        ...(community_id && { community_id }),
      },
      _count: {
        id: true,
      }
    });

    // Resumo por comunidade
    const communitySummary = await prisma.local_support_drivers.groupBy({
      by: ['community_id'],
      where: {
        ...(community_id && { community_id }),
      },
      _count: {
        id: true,
      }
    });

    return {
      by_status: statusSummary,
      by_community: communitySummary,
      total_drivers: statusSummary.reduce((sum, item) => sum + item._count.id, 0),
    };
  }
}

export const localSupportService = new LocalSupportService();