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
        { drivers: { name: { contains: search, mode: 'insensitive' } } },
        { passengers: { name: { contains: search, mode: 'insensitive' } } },
        { origin: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [rides, total] = await Promise.all([
      prisma.rides.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          driver_id: true,
          passenger_id: true,
          origin: true,
          destination: true,
          origin_lat: true,
          origin_lng: true,
          destination_lat: true,
          destination_lng: true,
          status: true,
          type: true,
          price: true,
          distance: true,
          duration: true,
          created_at: true,
          updated_at: true,
          started_at: true,
          completed_at: true,
          cancelled_at: true,
          cancellation_reason: true,
          // platform_fee_percentage: true, // TODO: Descomentar após aplicar migration add_metrics_fields.sql
          match_type: true,
          pickup_neighborhood_id: true,
          dropoff_neighborhood_id: true,
          distance_km: true,
          duration_minutes: true,
          drivers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          passengers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.rides.count({ where }),
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
    const ride = await prisma.rides.findUnique({
      where: { id },
      select: {
        id: true,
        driver_id: true,
        passenger_id: true,
        origin: true,
        destination: true,
        origin_lat: true,
        origin_lng: true,
        destination_lat: true,
        destination_lng: true,
        status: true,
        type: true,
        price: true,
        distance: true,
        duration: true,
        created_at: true,
        updated_at: true,
        started_at: true,
        completed_at: true,
        cancelled_at: true,
        cancellation_reason: true,
        // platform_fee_percentage: true, // TODO: Descomentar após aplicar migration add_metrics_fields.sql
        match_type: true,
        pickup_neighborhood_id: true,
        dropoff_neighborhood_id: true,
        distance_km: true,
        duration_minutes: true,
        drivers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        passengers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        ride_status_history: {
          orderBy: { created_at: 'asc' },
        },
        ride_admin_actions: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    return ride;
  }

  // Update ride status (atomic with concurrency protection)
  async updateRideStatus(rideId: string, data: UpdateStatusData, admin_id: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const ride_id = rideId;
      // Get current ride state within transaction for consistency
      const ride = await tx.rides.findUnique({
        where: { id: rideId },
        select: { status: true, price: true, updated_at: true }
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
        updateData.platform_fee = financials.platform_fee;
        updateData.driver_amount = financials.driver_amount;
      }

      // Atomic update with optimistic locking check
      const updatedRide = await tx.rides.updateMany({
        where: { 
          id: ride_id,
          status: ride.status, // Ensure status hasn't changed since we read it
          updated_at: ride.updated_at // Optimistic locking
        },
        data: updateData,
      });

      // Check if update actually happened (concurrency protection)
      if (updatedRide.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      // Get updated ride for return
      const finalRide = await tx.rides.findUnique({
        where: { id: ride_id }
      });

      // Add status history
      await tx.ride_status_history.create({
        data: {
          id: crypto.randomUUID(),
          ride_id,
          status: data.status,
          created_at: now,
        },
      });

      // Log admin action
      await tx.ride_admin_actions.create({
        data: {
          id: crypto.randomUUID(),
          ride_id,
          admin_id,
          action: 'status_update',
          reason: data.reason,
          old_value: ride.status,
          new_value: data.status,
          created_at: now,
        },
      });

      return finalRide;
    });
  }

  // Cancel ride administratively (atomic with concurrency protection)
  async cancelRide(ride_id: string, data: CancelRideData, admin_id: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      // Get current ride state within transaction
      const ride = await tx.rides.findUnique({
        where: { id: ride_id },
        select: { status: true, updated_at: true }
      });

      if (!ride) {
        throw new Error('Corrida não encontrada');
      }

      if (['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)) {
        throw new Error('Corrida já foi finalizada ou cancelada');
      }

      // Atomic update with optimistic locking
      const updatedRideCount = await tx.rides.updateMany({
        where: { 
          id: ride_id,
          status: ride.status, // Ensure status hasn't changed
          updated_at: ride.updated_at // Optimistic locking
        },
        data: {
          status: 'cancelled_by_admin',
          cancel_reason: data.reason,
          cancelled_by: admin_id,
          cancelled_at: new Date(),
        },
      });

      // Check if update actually happened (concurrency protection)
      if (updatedRideCount.count === 0) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      // Get updated ride for return
      const updatedRide = await tx.rides.findUnique({
        where: { id: ride_id }
      });

      await tx.ride_status_history.create({
        data: {
          id: `${ride_id}-status-${Date.now()}`,
          ride_id,
          status: 'cancelled_by_admin',
        },
      });

      await tx.ride_admin_actions.create({
        data: {
          id: `${ride_id}-action-${Date.now()}`,
          ride_id,
          admin_id,
          action: 'cancel',
          reason: data.reason,
        },
      });

      return updatedRide;
    });
  }

  // Force complete ride (SUPER_ADMIN only)
  async forceCompleteRide(ride_id: string, data: ForceCompleteRideData, admin_id: string) {
    const ride = await prisma.rides.findUnique({
      where: { id: ride_id },
      select: { status: true, price: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)) {
      throw new Error('Corrida já foi finalizada');
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const financials = this.calculateFinancials(Number(ride.price));
      
      const updatedRide = await tx.rides.update({
        where: { id: ride_id },
        data: {
          status: 'completed',
          platform_fee: financials.platform_fee,
          driver_amount: financials.driver_amount,
          forced_completed_by: admin_id,
          forced_completed_at: new Date(),
        },
      });

      await tx.ride_status_history.create({
        data: {
          id: `${ride_id}-status-${Date.now()}`,
          ride_id,
          status: 'completed',
        },
      });

      await tx.ride_admin_actions.create({
        data: {
          id: `${ride_id}-action-${Date.now()}`,
          ride_id,
          admin_id,
          action: 'force_complete',
          reason: data.reason,
        },
      });

      // Handle diamond completion
//       await this.diamondService.handleRideComplete(ride_id, updatedRide.driver_id || undefined);

      return updatedRide;
    });
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
