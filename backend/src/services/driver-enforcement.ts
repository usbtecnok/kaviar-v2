import { prisma } from '../config/database';
import { config } from '../config';

export interface DriverStatusCheck {
  isBlocked: boolean;
  blockReason?: 'DELETED' | 'BANNED' | 'SUSPENDED';
  message?: string;
  details?: {
    deletedAt?: string;
    bannedAt?: string;
    suspendedAt?: string;
    reason?: string;
  };
}

export class DriverEnforcementService {

  /**
   * Check if driver is blocked from operations
   */
  async checkDriverStatus(driverId: string): Promise<DriverStatusCheck> {
    // Skip enforcement if gates are disabled
    if (!config.driverEnforcement.enableEnforcementGates) {
      return { isBlocked: false };
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        deletedAt: true,
        deletedBy: true,
        bannedAt: true,
        bannedBy: true,
        bannedReason: true,
        suspendedAt: true,
        suspendedBy: true,
        suspensionReason: true
      }
    });

    if (!driver) {
      return {
        isBlocked: true,
        blockReason: 'DELETED',
        message: 'Motorista não encontrado'
      };
    }

    // Check in order of severity: deleted > banned > suspended
    if (driver.deletedAt) {
      return {
        isBlocked: true,
        blockReason: 'DELETED',
        message: 'Conta removida do sistema',
        details: {
          deletedAt: driver.deletedAt.toISOString()
        }
      };
    }

    if (driver.bannedAt) {
      return {
        isBlocked: true,
        blockReason: 'BANNED',
        message: 'Motorista banido permanentemente',
        details: {
          bannedAt: driver.bannedAt.toISOString(),
          reason: driver.bannedReason || 'Não especificado'
        }
      };
    }

    if (driver.suspendedAt) {
      return {
        isBlocked: true,
        blockReason: 'SUSPENDED',
        message: 'Motorista temporariamente suspenso',
        details: {
          suspendedAt: driver.suspendedAt.toISOString(),
          reason: driver.suspensionReason || 'Não especificado'
        }
      };
    }

    return { isBlocked: false };
  }

  /**
   * Ban a driver
   */
  async banDriver(driverId: string, reason: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          bannedAt: new Date(),
          bannedBy: adminId,
          bannedReason: reason
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'BAN',
          reason,
          metadata: {
            previousStatus: 'active'
          }
        }
      });

      return updatedDriver;
    });
  }

  /**
   * Unban a driver
   */
  async unbanDriver(driverId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          bannedAt: null,
          bannedBy: null,
          bannedReason: null
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'UNBAN',
          reason: 'Banimento removido por admin'
        }
      });

      return updatedDriver;
    });
  }

  /**
   * Soft delete a driver
   */
  async softDeleteDriver(driverId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          deletedAt: new Date(),
          deletedBy: adminId
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'SOFT_DELETE',
          reason: 'Conta removida do sistema'
        }
      });

      return updatedDriver;
    });
  }

  /**
   * Restore a soft deleted driver
   */
  async restoreDriver(driverId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          deletedAt: null,
          deletedBy: null
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'RESTORE',
          reason: 'Conta restaurada por admin'
        }
      });

      return updatedDriver;
    });
  }

  /**
   * Get enforcement history for a driver
   */
  async getEnforcementHistory(driverId: string) {
    return prisma.driverEnforcementHistory.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Last 50 actions
    });
  }

  /**
   * Enhanced suspend with audit trail
   */
  async suspendDriverWithAudit(driverId: string, reason: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          status: 'suspended',
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy: adminId
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'SUSPEND',
          reason
        }
      });

      return updatedDriver;
    });
  }

  /**
   * Enhanced reactivate with audit trail
   */
  async reactivateDriverWithAudit(driverId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: {
          status: 'approved',
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null
        }
      });

      await tx.driverEnforcementHistory.create({
        data: {
          driverId,
          adminId,
          action: 'REACTIVATE',
          reason: 'Suspensão removida por admin'
        }
      });

      return updatedDriver;
    });
  }
}
