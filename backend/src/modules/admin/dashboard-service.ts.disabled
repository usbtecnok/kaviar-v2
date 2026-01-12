import { prisma } from '../../config/database';

export class DashboardService {
  async getMetrics() {
    const [
      totalDrivers,
      totalPassengers,
      totalRides,
      activeRides,
      completedRides,
      pendingDrivers,
      approvedDrivers,
      totalRevenue,
      todayRides
    ] = await Promise.all([
      // Total de motoristas
      prisma.drivers.count(),
      
      // Total de passageiros
      prisma.passengers.count(),
      
      // Total de corridas
      prisma.rides.count(),
      
      // Corridas ativas (em andamento)
      prisma.rides.count({
        where: {
          status: {
            in: ['requested', 'driver_assigned', 'in_progress']
          }
        }
      }),
      
      // Corridas finalizadas
      prisma.rides.count({
        where: { status: 'completed' }
      }),
      
      // Motoristas pendentes de aprovação
      prisma.drivers.count({
        where: { status: 'pending' }
      }),
      
      // Motoristas aprovados
      prisma.drivers.count({
        where: { status: 'approved' }
      }),
      
      // Receita total (corridas completadas)
      prisma.rides.aggregate({
        where: { status: 'completed' },
        _sum: { price: true }
      }),
      
      // Corridas de hoje
      prisma.rides.count({
        where: {
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    return {
      overview: {
        totalDrivers,
        totalPassengers,
        totalRides,
        activeRides,
        completedRides,
        todayRides
      },
      drivers: {
        total: totalDrivers,
        pending: pendingDrivers,
        approved: approvedDrivers,
        suspended: totalDrivers - pendingDrivers - approvedDrivers
      },
      financial: {
        totalRevenue: totalRevenue._sum.price || 0,
        averageRideValue: completedRides > 0 
          ? Number(totalRevenue._sum.price || 0) / completedRides 
          : 0
      }
    };
  }

  async getRecentRides(limit = 10) {
    return prisma.rides.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        drivers: {
          select: { id: true, name: true, email: true }
        },
        passengers: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async getDriversOverview() {
    const [byStatus, recentDrivers] = await Promise.all([
      prisma.drivers.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      prisma.drivers.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          created_at: true
        }
      })
    ]);

    return {
      byStatus,
      recent: recentDrivers
    };
  }
}
