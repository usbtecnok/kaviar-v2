import crypto from "node:crypto";
import { prisma } from '../../lib/prisma';
import { RidesQuery, CancelRideData, ReassignRideData, ForceCompleteRideData, UpdateStatusData, AuditQuery } from './schemas';

export class RideAdminService {
// //   private diamondService = new DiamondService();

  // Calculate financial breakdown
  private calculateFinancials(price: number) {
    const grossValue = price;
    const platform_fee = grossValue * 0.15; // 15% platform fee
    const driver_amount = grossValue - platform_fee;
    
    return {
      platform_fee: Number(platform_fee.toFixed(2)),
      driver_amount: Number(driver_amount.toFixed(2))
    };
  }

  // Validate status transitions
  private validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      requested: ['accepted', 'cancelled_by_admin', 'cancelled_by_user'],
      accepted: ['arrived', 'cancelled_by_admin', 'cancelled_by_driver'],
      arrived: ['started', 'cancelled_by_admin', 'cancelled_by_driver'],
      started: ['completed', 'cancelled_by_admin'],
      completed: ['paid'],
      paid: [], // Final state
      cancelled_by_user: [], // Final state
      cancelled_by_driver: [], // Final state
      cancelled_by_admin: [] // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Get rides with filters
  async getRides(query: RidesQuery) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type,
      driver_id, 
      passengerId, 
      search, 
      dateFrom, 
      dateTo, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (type) where.type = type;
    if (driver_id) where.driver_id = driver_id;
    if (passengerId) where.passenger_id = passengerId;
    
    if (search) {
      where.OR = [
        { driver: { name: { contains: search, mode: 'insensitive' } } },
        { passenger: { name: { contains: search, mode: 'insensitive' } } },
        { origin_text: { contains: search, mode: 'insensitive' } },
        { destination_text: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [rides, total] = await Promise.all([
      prisma.rides_v2.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          passenger: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.rides_v2.count({ where }),
    ]);

    // Normalize for frontend compatibility (rides_v2 → rides field names)
    const normalized = rides.map(r => ({
      ...r,
      origin: r.origin_text,
      destination: r.destination_text,
      type: r.ride_type,
      price: Number(r.final_price ?? r.adjusted_price ?? r.locked_price ?? r.quoted_price ?? 0),
      driver_adjustment: r.driver_adjustment ? Number(r.driver_adjustment) : null,
      driver: r.driver,
      passenger: r.passenger,
      drivers: r.driver,
      passengers: r.passenger,
    }));

    return {
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get ride details
  async getRideById(id: string) {
    const ride = await prisma.rides_v2.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        passenger: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        offers: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    return {
      ...ride,
      origin: ride.origin_text,
      destination: ride.destination_text,
      type: ride.ride_type,
      price: Number(ride.final_price ?? ride.adjusted_price ?? ride.locked_price ?? ride.quoted_price ?? 0),
      driver_adjustment: ride.driver_adjustment ? Number(ride.driver_adjustment) : null,
      driver: ride.driver,
      passenger: ride.passenger,
      drivers: ride.driver,
      passengers: ride.passenger,
    };
  }


  // Cancel ride administratively (atomic with concurrency protection)
  async cancelRide(ride_id: string, data: CancelRideData, admin_id: string) {
    const ride = await prisma.rides_v2.findUnique({
      where: { id: ride_id },
      select: { status: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (['completed', 'canceled_by_passenger', 'canceled_by_driver'].includes(ride.status)) {
      throw new Error('Corrida já foi finalizada ou cancelada');
    }

    const updatedRide = await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'canceled_by_driver', // closest available status for admin cancel
        canceled_at: new Date(),
      },
    });

    return updatedRide;
  }

  // Force complete ride (SUPER_ADMIN only)
  async forceCompleteRide(ride_id: string, data: ForceCompleteRideData, admin_id: string) {
    const ride = await prisma.rides_v2.findUnique({
      where: { id: ride_id },
      select: { status: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (['completed', 'canceled_by_passenger', 'canceled_by_driver'].includes(ride.status)) {
      throw new Error('Corrida já foi finalizada');
    }

    const updatedRide = await prisma.rides_v2.update({
      where: { id: ride_id },
      data: {
        status: 'completed',
        completed_at: new Date(),
      },
    });

    return updatedRide;
  }

  // Update ride status (admin)
  async updateRideStatus(rideId: string, data: UpdateStatusData, admin_id: string) {
    const ride = await prisma.rides_v2.findUnique({
      where: { id: rideId },
      select: { status: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (!this.validateStatusTransition(ride.status, data.status)) {
      throw new Error(`Transição inválida: ${ride.status} → ${data.status}`);
    }

    const updatedRide = await prisma.rides_v2.update({
      where: { id: rideId },
      data: {
        status: data.status as any,
        ...(data.status === 'completed' && { completed_at: new Date() }),
        ...(data.status.startsWith('cancel') && { canceled_at: new Date() }),
      },
    });

    return updatedRide;
  }

  // Get audit logs
  async getAuditLogs(query: AuditQuery) {
    const { page = 1, 
      limit = 20, 
      rideId, 
      adminId, 
      action, 
      dateFrom, 
      dateTo 
    } = query;
    
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (rideId) where.rideId = rideId;
    if (adminId) where.admin_id = adminId;
    if (action) where.action = action;
    
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.ride_admin_actions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          rides: {
            select: {
              id: true,
              origin: true,
              destination: true,
            },
          },
        },
      }),
      prisma.ride_admin_actions.count({ where }),
    ]);

    // Get admin details for each log
    const logsWithAdminDetails = await Promise.all(
      logs.map(async (log) => {
        const admin = await prisma.admins.findUnique({
          where: { id: log.admin_id },
          select: {
            name: true,
            role: true,
          }
        });

        return {
          ...log,
          adminName: admin?.name || 'Admin Desconhecido',
          adminRole: admin?.role || 'ADMIN',
        };
      })
    );

    return {
      data: logsWithAdminDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
