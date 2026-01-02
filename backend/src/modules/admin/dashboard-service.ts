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
      prisma.driver.count(),
      
      // Total de passageiros
      prisma.passenger.count(),
      
      // Total de corridas
      prisma.ride.count(),
      
      // Corridas ativas (em andamento)
      prisma.ride.count({
        where: {
          status: {
            in: ['requested', 'driver_assigned', 'in_progress']
          }
        }
      }),
      
      // Corridas finalizadas
      prisma.ride.count({
        where: { status: 'completed' }
      }),
      
      // Motoristas pendentes de aprovação
      prisma.driver.count({
        where: { status: 'pending' }
      }),
      
      // Motoristas aprovados
      prisma.driver.count({
        where: { status: 'approved' }
      }),
      
      // Receita total (corridas completadas)
      prisma.ride.aggregate({
        where: { status: 'completed' },
        _sum: { price: true }
      }),
      
      // Corridas de hoje
      prisma.ride.count({
        where: {
          createdAt: {
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
    return prisma.ride.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          select: { id: true, name: true, email: true }
        },
        passenger: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async getDriversOverview() {
    const [byStatus, recentDrivers] = await Promise.all([
      prisma.driver.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      
      prisma.driver.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          _count: {
            select: { rides: true }
          }
        }
      })
    ]);

    return {
      byStatus,
      recent: recentDrivers
    };
  }
}
