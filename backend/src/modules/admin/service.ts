import { prisma } from '../../config/database';
import { DriversQuery, PassengersQuery, RidesQuery, SuspendDriverData, CancelRideData, ReassignRideData, ForceCompleteRideData } from './schemas';

export class AdminService {
  // Drivers
  async getDrivers(query: DriversQuery) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      dateFrom, 
      dateTo, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = query;
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          suspensionReason: true,
          suspendedAt: true,
          lastActiveAt: true,
          createdAt: true,
          _count: {
            select: { rides: true },
          },
        },
      }),
      prisma.driver.count({ where }),
    ]);

    return {
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Aprovar motorista
  async approveDriver(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'pending') {
      throw new Error('Apenas motoristas pendentes podem ser aprovados');
    }

    return prisma.driver.update({
      where: { id: driverId },
      data: { 
        status: 'approved',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      }
    });
  }

  // Suspender motorista
  async suspendDriver(driverId: string, data: SuspendDriverData, adminId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'approved') {
      throw new Error('Apenas motoristas aprovados podem ser suspensos');
    }

    return prisma.driver.update({
      where: { id: driverId },
      data: { 
        status: 'suspended',
        suspensionReason: data.reason,
        suspendedAt: new Date(),
        suspendedBy: adminId,
      }
    });
  }

  // Reativar motorista
  async reactivateDriver(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'suspended') {
      throw new Error('Apenas motoristas suspensos podem ser reativados');
    }

    return prisma.driver.update({
      where: { id: driverId },
      data: { 
        status: 'approved',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      }
    });
  }

  // Get driver details
  async getDriverById(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        rides: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            price: true,
            createdAt: true,
            passenger: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: { rides: true }
        }
      }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    return driver;
  }

  // Check if driver can accept rides
  async canDriverAcceptRides(driverId: string): Promise<boolean> {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { status: true }
    });

    return driver?.status === 'approved';
  }

  // Passengers
  async getPassengers(query: PassengersQuery) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [passengers, total] = await Promise.all([
      prisma.passenger.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: {
            select: { rides: true },
          },
        },
      }),
      prisma.passenger.count(),
    ]);

    return {
      data: passengers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Rides
  async getRides(query: RidesQuery) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
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

  // Ride details
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

  // Cancel ride administratively
  async cancelRide(rideId: string, data: CancelRideData, adminId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { status: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      throw new Error('Corrida já foi finalizada ou cancelada');
    }

    return prisma.$transaction(async (tx) => {
      // Update ride status
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: 'cancelled',
          cancelReason: data.reason,
          cancelledBy: adminId,
          cancelledAt: new Date(),
        },
      });

      // Add status history
      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: 'cancelled',
        },
      });

      // Log admin action
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

  // Reassign driver
  async reassignDriver(rideId: string, data: ReassignRideData, adminId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { status: true, driverId: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      throw new Error('Não é possível reatribuir corrida finalizada');
    }

    // Check if new driver exists and is approved
    const newDriver = await prisma.driver.findUnique({
      where: { id: data.newDriverId },
      select: { status: true }
    });

    if (!newDriver) {
      throw new Error('Motorista não encontrado');
    }

    if (newDriver.status !== 'approved') {
      throw new Error('Motorista não está aprovado para receber corridas');
    }

    return prisma.$transaction(async (tx) => {
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverId: data.newDriverId,
          status: 'driver_assigned',
        },
      });

      // Add status history
      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: 'driver_assigned',
        },
      });

      // Log admin action
      await tx.rideAdminAction.create({
        data: {
          rideId,
          adminId,
          action: 'reassign_driver',
          reason: data.reason,
          oldValue: ride.driverId,
          newValue: data.newDriverId,
        },
      });

      return updatedRide;
    });
  }

  // Force complete ride
  async forceCompleteRide(rideId: string, data: ForceCompleteRideData, adminId: string) {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { status: true }
    });

    if (!ride) {
      throw new Error('Corrida não encontrada');
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      throw new Error('Corrida já foi finalizada');
    }

    return prisma.$transaction(async (tx) => {
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: 'completed',
          forcedCompletedBy: adminId,
          forcedCompletedAt: new Date(),
        },
      });

      // Add status history
      await tx.rideStatusHistory.create({
        data: {
          rideId,
          status: 'completed',
        },
      });

      // Log admin action
      await tx.rideAdminAction.create({
        data: {
          rideId,
          adminId,
          action: 'force_complete',
          reason: data.reason,
        },
      });

      return updatedRide;
    });
  }
}
