import { prisma } from '../config/database';

export class CommunityActivationService {
  
  /**
   * Count active drivers in a community
   * Active = status='approved' AND isActive=true AND suspendedAt IS NULL (future-proof)
   */
  async countActiveDrivers(communityId: string): Promise<number> {
    return prisma.driver.count({
      where: {
        communityId,
        status: 'approved',
        // Future-proof for soft delete
        suspendedAt: null,
      }
    });
  }

  /**
   * Evaluate and update community activation status
   * Rules: Activate ≥5, Deactivate ≤3 (hysteresis)
   */
  async evaluateCommunityActivation(communityId: string, changedBy: string = 'system'): Promise<void> {
    return prisma.$transaction(async (tx) => {
      // Get current community state
      const community = await tx.community.findUnique({
        where: { id: communityId },
        select: {
          id: true,
          isActive: true,
          minActiveDrivers: true,
          deactivationThreshold: true,
          autoActivation: true
        }
      });

      if (!community || !community.autoActivation) {
        return; // Skip if community doesn't exist or auto-activation is disabled
      }

      // Count active drivers
      const activeDriverCount = await tx.driver.count({
        where: {
          communityId,
          status: 'approved',
          suspendedAt: null, // Future-proof for soft delete
        }
      });

      const { isActive, minActiveDrivers, deactivationThreshold } = community;
      let newIsActive = isActive;
      let reason = '';

      // Apply hysteresis rules
      if (!isActive && activeDriverCount >= minActiveDrivers) {
        // Activate: has enough drivers
        newIsActive = true;
        reason = `Ativada automaticamente: ${activeDriverCount} motoristas aptos (≥${minActiveDrivers})`;
      } else if (isActive && activeDriverCount <= deactivationThreshold) {
        // Deactivate: too few drivers (hysteresis)
        newIsActive = false;
        reason = `Desativada automaticamente: ${activeDriverCount} motoristas aptos (≤${deactivationThreshold})`;
      }

      // Update community if status changed
      if (newIsActive !== isActive) {
        await tx.community.update({
          where: { id: communityId },
          data: {
            isActive: newIsActive,
            lastEvaluatedAt: new Date()
          }
        });

        // Log status change
        await tx.communityStatusHistory.create({
          data: {
            communityId,
            status: newIsActive ? 'ACTIVE' : 'INACTIVE',
            fromIsActive: isActive,
            toIsActive: newIsActive,
            driverCount: activeDriverCount,
            reason,
            changedBy
          }
        });

        console.log(`🏘️ Community ${communityId}: ${isActive ? 'Active' : 'Inactive'} → ${newIsActive ? 'Active' : 'Inactive'} (${activeDriverCount} drivers)`);
      } else {
        // Just update evaluation timestamp
        await tx.community.update({
          where: { id: communityId },
          data: { lastEvaluatedAt: new Date() }
        });
      }
    });
  }

  /**
   * Evaluate all communities (for batch processing)
   */
  async evaluateAllCommunities(): Promise<void> {
    const communities = await prisma.community.findMany({
      where: { autoActivation: true },
      select: { id: true }
    });

    for (const community of communities) {
      await this.evaluateCommunityActivation(community.id, 'system');
    }
  }

  /**
   * Check if community can accept new ride requests
   * Protects against "liga/desliga" during operation
   */
  async canAcceptNewRides(communityId: string): Promise<boolean> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { isActive: true }
    });

    return community?.isActive ?? false;
  }

  /**
   * Get community activation status with metrics
   */
  async getCommunityStatus(communityId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!community) {
      throw new Error('Comunidade não encontrada');
    }

    const activeDriverCount = await this.countActiveDrivers(communityId);

    return {
      ...community,
      activeDriverCount,
      nextThreshold: community.isActive 
        ? `Desativa com ≤${community.deactivationThreshold} motoristas`
        : `Ativa com ≥${community.minActiveDrivers} motoristas`
    };
  }
}
