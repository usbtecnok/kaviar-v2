import { prisma } from '../../config/database';
import { DriversQuery, PassengersQuery, RidesQuery, SuspendDriverData, CancelRideData, ReassignRideData, ForceCompleteRideData } from './schemas';
// import { CommunityActivationService } from '../../services/community-activation';
import { DriverVerificationService } from '../../services/driver-verification';
import { DriverEnforcementService } from '../../services/driver-enforcement';
import { config } from '../../config';

export class AdminService {
  private communityActivation = new CommunityActivationService();
  private driverVerification = new DriverVerificationService();
  private driverEnforcement = new DriverEnforcementService();
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
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [drivers, total] = await Promise.all([
      prisma.drivers.findMany({
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
          created_at: true,
          _count: {
            select: { rides: true },
          },
        },
      }),
      prisma.drivers.count({ where }),
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

  // Aprovar motorista (with optional eligibility gates)
  async approveDriver(driverId: string) {
    // Check if approval gates are enabled
    if (!config.driverGovernance.enableApprovalGates) {
      return this.approveDriverLegacy(driverId);
    }

    // New behavior with gates
    return this.approveDriverWithGates(driverId);
  }

  // Legacy approval behavior (no gates)
  private async approveDriverLegacy(driverId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, status: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'pending') {
      throw new Error('Apenas motoristas pendentes podem ser aprovados');
    }

    const updatedDriver = await prisma.drivers.update({
      where: { id: driverId },
      data: { 
        status: 'approved',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      }
    });

    // Reavaliar ativação da comunidade após aprovação
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, 'system');
    }

    return updatedDriver;
  }

  // New approval behavior with gates
  private async approveDriverWithGates(driverId: string) {
    // Check eligibility first
    const eligibility = await this.driverVerification.evaluateEligibility(driverId);
    
    if (!eligibility.isEligible) {
      const error = new Error('DRIVER_NOT_ELIGIBLE') as any;
      error.code = 'DRIVER_NOT_ELIGIBLE';
      error.missingRequirements = eligibility.missingRequirements;
      error.details = this.formatMissingRequirementsDetails(eligibility.missingRequirements);
      throw error;
    }

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, status: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'pending') {
      throw new Error('Apenas motoristas pendentes podem ser aprovados');
    }

    const updatedDriver = await prisma.$transaction(async (tx) => {
      // Update driver status
      const updated = await tx.driver.update({
        where: { id: driverId },
        data: { 
          status: 'approved',
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null,
        }
      });

      // Update verification record
      await tx.driverVerification.update({
        where: { driverId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedByAdminId: 'system' // TODO: get actual admin ID
        }
      });

      return updated;
    });

    // Reavaliar ativação da comunidade após aprovação
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, 'system');
    }

    return updatedDriver;
  }

  private formatMissingRequirementsDetails(missingRequirements: string[]): Record<string, string> {
    const details: Record<string, string> = {};
    
    for (const requirement of missingRequirements) {
      switch (requirement) {
        case 'LGPD_CONSENT':
          details.lgpdConsent = 'Consentimento LGPD não aceito';
          break;
        case 'CPF':
          details.cpf = 'Documento CPF não verificado';
          break;
        case 'RG':
          details.rg = 'Documento RG não verificado';
          break;
        case 'CNH':
          details.cnh = 'Documento CNH não verificado';
          break;
        case 'PROOF_OF_ADDRESS':
          details.proofOfAddress = 'Comprovante de residência não verificado';
          break;
        case 'VEHICLE_PHOTO':
          details.vehiclePhotos = 'Fotos do veículo não enviadas ou não verificadas';
          break;
        case 'BACKGROUND_CHECK':
          details.backgroundCheck = 'Verificação de antecedentes não realizada';
          break;
        case 'COMMUNITY_ASSIGNMENT':
          details.communityAssignment = 'Comunidade não atribuída';
          break;
        default:
          details[requirement.toLowerCase()] = `Requisito ${requirement} não atendido`;
      }
    }
    
    return details;
  }

  // Suspender motorista (enhanced with audit)
  async suspendDriver(driverId: string, data: SuspendDriverData, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, status: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'approved') {
      throw new Error('Apenas motoristas aprovados podem ser suspensos');
    }

    // Use enhanced suspension with audit trail
    const updatedDriver = await this.driverEnforcement.suspendDriverWithAudit(
      driverId, 
      data.reason, 
      adminId
    );

    // Reavaliar ativação da comunidade após suspensão
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, adminId);
    }

    return updatedDriver;
  }

  // Reativar motorista (enhanced with audit)
  async reactivateDriver(driverId: string, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, status: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.status !== 'suspended') {
      throw new Error('Apenas motoristas suspensos podem ser reativados');
    }

    // Use enhanced reactivation with audit trail
    const updatedDriver = await this.driverEnforcement.reactivateDriverWithAudit(
      driverId,
      adminId
    );

    // Reavaliar ativação da comunidade após reativação
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, 'system');
    }

    return updatedDriver;
  }

  // Ban driver
  async banDriver(driverId: string, reason: string, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, bannedAt: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.bannedAt) {
      throw new Error('Motorista já está banido');
    }

    const updatedDriver = await this.driverEnforcement.banDriver(driverId, reason, adminId);

    // Reavaliar ativação da comunidade
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, adminId);
    }

    return updatedDriver;
  }

  // Unban driver
  async unbanDriver(driverId: string, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, bannedAt: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (!driver.bannedAt) {
      throw new Error('Motorista não está banido');
    }

    return this.driverEnforcement.unbanDriver(driverId, adminId);
  }

  // Soft delete driver
  async softDeleteDriver(driverId: string, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, deletedAt: true, communityId: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (driver.deletedAt) {
      throw new Error('Motorista já foi removido');
    }

    const updatedDriver = await this.driverEnforcement.softDeleteDriver(driverId, adminId);

    // Reavaliar ativação da comunidade
    if (driver.communityId) {
      await this.communityActivation.evaluateCommunityActivation(driver.communityId, adminId);
    }

    return updatedDriver;
  }

  // Restore driver
  async restoreDriver(driverId: string, adminId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { id: true, deletedAt: true }
    });

    if (!driver) {
      throw new Error('Motorista não encontrado');
    }

    if (!driver.deletedAt) {
      throw new Error('Motorista não foi removido');
    }

    return this.driverEnforcement.restoreDriver(driverId, adminId);
  }

  // Get enforcement history
  async getDriverEnforcementHistory(driverId: string) {
    return this.driverEnforcement.getEnforcementHistory(driverId);
  }

  // Get driver details
  async getDriverById(driverId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      include: {
        rides: {
          take: 10,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            status: true,
            price: true,
            created_at: true,
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

  // Check if driver can accept rides (enhanced with enforcement)
  async canDriverAcceptRides(driverId: string): Promise<boolean> {
    // Check enforcement status first
    const enforcementStatus = await this.driverEnforcement.checkDriverStatus(driverId);
    if (enforcementStatus.isBlocked) {
      return false;
    }

    // Check basic status
    const driver = await prisma.drivers.findUnique({
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
      prisma.passengers.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          created_at: true,
          _count: {
            select: { rides: true },
          },
        },
      }),
      prisma.passengers.count(),
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

  // Ride details
  async getRideById(id: string) {
    const ride = await prisma.rides.findUnique({
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
          orderBy: { created_at: 'asc' },
        },
        adminActions: {
          orderBy: { created_at: 'desc' },
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
    const ride = await prisma.rides.findUnique({
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
    const ride = await prisma.rides.findUnique({
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
    const newDriver = await prisma.drivers.findUnique({
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
    const ride = await prisma.rides.findUnique({
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
