import { prisma } from '../../config/database';
import { DiamondService } from '../../services/diamond';
import { RidesQuery, CancelRideData, ReassignRideData, ForceCompleteRideData, UpdateStatusData, AuditQuery } from './schemas';

export class RideAdminService {
  private diamondService = new DiamondService();

  // Calculate financial breakdown
  private calculateFinancials(price: number) {
    const grossValue = price;
    const platformFee = grossValue * 0.15; // 15% platform fee
    const driverAmount = grossValue - platformFee;
    
    return {
      platformFee: Number(platformFee.toFixed(2)),
      driverAmount: Number(driverAmount.toFixed(2))
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
      driverId, 
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
    if (driverId) where.driverId = driverId;
    if (passengerId) where.passengerId = passengerId;
    
    if (search) {
      where.OR = [
        { driver: { name: { contains: search, mode: 'insensitive' } } },
        { passenger: { name: { contains: search, mode: 'insensitive' } } },
        { origin: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
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
      prisma.ride.count({ where }),
    ]);

    return {
      data: rides,
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
    const ride = await prisma.ride.findUnique({
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
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        adminActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    return ride;
  }

  // Update ride status (atomic with concurrency protection)
  async updateRideStatus(rideId: string, data: UpdateStatusData, adminId: string) {
    return prisma.$transaction(async (tx) => {
      // Get current ride state within transaction for consistency
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        select: { status: true, price: true, updatedAt: true }
      });

      if (!ride) {
        throw new Error('Corrida não encontrada');
      }

      // Validate transition
      if (!this.validateStatusTransition(ride.status, data.status)) {
        throw new Error(`Transição inválida: ${ride.status} → ${data.status}`);
      }

      // Calculate financials if completing
      let updateData: any = { status: data.status };
      
      if (data.status === 'completed') {
        const financials = this.calculateFinancials(Number(ride.price));
        updateData.platformFee = financials.platformFee;
        updateData.driverAmount = financials.driverAmount;
      }

      // Atomic update with optimistic locking check
      const updatedRide = await tx.ride.updateMany({
        where: { 
          id: rideId,
          status: ride.status, // Ensure status hasn't changed since we read it
          updatedAt: ride.updatedAt // Optimistic locking
        },
        data: updateData,
      });

      // Check if update actually happened (concurrency protection)
      if (updatedRide.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      // Get updated ride for return
      const finalRide = await tx.ride.findUnique({
        where: { id: rideId }
      });

      // Add status history
      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: data.status,
        },
      });

      // Log admin action
      await tx.rideAdminAction.create({
        data: {
          rideId,
          adminId,
          action: 'status_update',
          reason: data.reason,
          oldValue: ride.status,
          newValue: data.status,
        },
      });

      return finalRide;
    });
  }

  // Cancel ride administratively (atomic with concurrency protection)
  async cancelRide(rideId: string, data: CancelRideData, adminId: string) {
    return prisma.$transaction(async (tx) => {
      // Get current ride state within transaction
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        select: { status: true, updatedAt: true }
      });

      if (!ride) {
        throw new Error('Corrida não encontrada');
      }

      if (['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)) {
        throw new Error('Corrida já foi finalizada ou cancelada');
      }

      // Atomic update with optimistic locking
      const updatedRideCount = await tx.ride.updateMany({
        where: { 
          id: rideId,
          status: ride.status, // Ensure status hasn't changed
          updatedAt: ride.updatedAt // Optimistic locking
        },
        data: {
          status: 'cancelled_by_admin',
          cancelReason: data.reason,
          cancelledBy: adminId,
          cancelledAt: new Date(),
        },
      });

      // Check if update actually happened (concurrency protection)
      if (updatedRideCount.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      // Get updated ride for return
      const updatedRide = await tx.ride.findUnique({
        where: { id: rideId }
      });

      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: 'cancelled_by_admin',
        },
      });

      await tx.rideAdminAction.create({
        data: {
          rideId,
          adminId,
          action: 'cancel',
          reason: data.reason,
        },
      });

      return updatedRide;
    });
  }

  // Force complete ride (SUPER_ADMIN only)
  async forceCompleteRide(rideId: string, data: ForceCompleteRideData, adminId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { status: true, price: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)) {
      throw new Error('Corrida já foi finalizada');
    }

    return prisma.$transaction(async (tx) => {
      const financials = this.calculateFinancials(Number(ride.price));
      
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: 'completed',
          platformFee: financials.platformFee,
          driverAmount: financials.driverAmount,
          forcedCompletedBy: adminId,
          forcedCompletedAt: new Date(),
        },
      });

      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: 'completed',
        },
      });

      await tx.rideAdminAction.create({
        data: {
          rideId,
          adminId,
          action: 'force_complete',
          reason: data.reason,
        },
      });

      // Handle diamond completion
      await this.diamondService.handleRideComplete(rideId, updatedRide.driverId || undefined);

      return updatedRide;
    });
  }

  // Get audit logs
  async getAuditLogs(query: AuditQuery) {
    const { 
      page = 1, 
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
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.rideAdminAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ride: {
            select: {
              id: true,
              origin: true,
              destination: true,
            },
          },
        },
      }),
      prisma.rideAdminAction.count({ where }),
    ]);

    // Get admin details for each log
    const logsWithAdminDetails = await Promise.all(
      logs.map(async (log) => {
        const admin = await prisma.admin.findUnique({
          where: { id: log.adminId },
          select: {
            name: true,
            role: {
              select: { name: true }
            }
          }
        });

        return {
          ...log,
          adminName: admin?.name || 'Admin Desconhecido',
          adminRole: admin?.role?.name || 'ADMIN',
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
