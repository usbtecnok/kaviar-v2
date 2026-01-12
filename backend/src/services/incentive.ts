import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type IncentiveType = 'PRIORITY_BONUS' | 'PRIVATE_POOL' | 'ACTIVATION';

export interface IncentiveApplication {
  rideId: string;
  driverId: string;
  communityId?: string | null;
  operationalProfile: string;
  incentiveType: IncentiveType;
  value: number;
  applied: boolean;
  reason?: string;
}

/**
 * Incentive service - applies driver incentives after pricing
 * Integrates after pricing and before dispatch without altering passenger price
 */
export class IncentiveService {

  /**
   * Apply incentives after pricing calculation
   * Called between Pricing → Dispatch
   */
  async applyAfterPricing(rideId: string): Promise<IncentiveApplication[]> {
    // Get ride with immutable anchors and pricing
    const ride = await prisma.rides.findUnique({
      where: { id: rideId },
      include: {
        ride_pricing: true
      }
    });

    if (!ride || !ride.ride_pricing) {
      return [];
    }

    const applications: IncentiveApplication[] = [];

    // Apply incentives based on operational profile
    switch (ride.ride_pricing.community_id ? 
      await this.getOperationalProfile(ride.ride_pricing.community_id) : 'NORMAL') {
      
      case 'PRIORITY':
        applications.push(await this.applyPriorityBonus(ride));
        break;
        
      case 'PRIVATE':
        applications.push(await this.applyPrivatePool(ride));
        break;
        
      default:
        // Check for activation incentives (time-limited)
        const activation = await this.checkActivationIncentive(ride);
        if (activation) {
          applications.push(activation);
        }
        break;
    }

    return applications.filter(app => app.applied);
  }

  /**
   * PRIORITY: Bonus only if accepted in local phase
   */
  private async applyPriorityBonus(ride: any): Promise<IncentiveApplication> {
    const application: IncentiveApplication = {
      rideId: ride.id,
      driverId: ride.driver_id || 'pending',
      communityId: ride.community_id,
      operationalProfile: 'PRIORITY',
      incentiveType: 'PRIORITY_BONUS',
      value: 5.00, // R$ 5 bonus
      applied: false
    };

    // Only apply if driver is assigned (accepted in local phase)
    if (ride.driver_id && ride.status === 'accepted') {
      // Check anti-abuse: 1 incentive per ride
      const existing = await this.checkExistingIncentive(ride.id, ride.driver_id);
      if (!existing) {
        await this.persistIncentive(application);
        application.applied = true;
      } else {
        application.reason = 'Already has incentive for this ride';
      }
    } else {
      application.reason = 'Not accepted in local phase yet';
    }

    return application;
  }

  /**
   * PRIVATE: Pool exclusivo, bônus monetário opcional
   */
  private async applyPrivatePool(ride: any): Promise<IncentiveApplication> {
    const application: IncentiveApplication = {
      rideId: ride.id,
      driverId: ride.driver_id || 'pending',
      communityId: ride.community_id,
      operationalProfile: 'PRIVATE',
      incentiveType: 'PRIVATE_POOL',
      value: 3.00, // R$ 3 bonus for exclusive access
      applied: false
    };

    // Apply pool restriction (handled in DispatchService)
    // Optional monetary bonus
    if (ride.driver_id) {
      const existing = await this.checkExistingIncentive(ride.id, ride.driver_id);
      if (!existing) {
        await this.persistIncentive(application);
        application.applied = true;
      } else {
        application.reason = 'Already has incentive for this ride';
      }
    } else {
      application.reason = 'No driver assigned yet';
    }

    return application;
  }

  /**
   * ACTIVATION: Temporário com teto e data de fim
   */
  private async checkActivationIncentive(ride: any): Promise<IncentiveApplication | null> {
    // Check if community has active activation campaign
    if (!ride.community_id) return null;

    const now = new Date();
    const campaignEnd = new Date('2026-02-12'); // Example: 1 month campaign

    if (now > campaignEnd) return null;

    const application: IncentiveApplication = {
      rideId: ride.id,
      driverId: ride.driver_id || 'pending',
      communityId: ride.community_id,
      operationalProfile: 'ACTIVATION',
      incentiveType: 'ACTIVATION',
      value: 2.00, // R$ 2 activation bonus
      applied: false
    };

    if (ride.driver_id) {
      // Check daily/weekly cap per driver
      const driverIncentivesToday = await this.getDriverIncentivesToday(ride.driver_id);
      const dailyCap = 50.00; // R$ 50 daily cap

      if (driverIncentivesToday < dailyCap) {
        const existing = await this.checkExistingIncentive(ride.id, ride.driver_id);
        if (!existing) {
          await this.persistIncentive(application);
          application.applied = true;
        } else {
          application.reason = 'Already has incentive for this ride';
        }
      } else {
        application.reason = 'Daily cap reached';
      }
    } else {
      application.reason = 'No driver assigned yet';
    }

    return application;
  }

  /**
   * Get operational profile from community
   */
  private async getOperationalProfile(communityId: string): Promise<string> {
    const community = await prisma.communities.findFirst({
      where: { id: communityId, is_active: true }
    });
    return community?.operational_profile || 'NORMAL';
  }

  /**
   * Check if driver already has incentive for this ride (anti-abuse)
   */
  private async checkExistingIncentive(rideId: string, driverId: string): Promise<boolean> {
    const existing = await prisma.driver_incentives.findFirst({
      where: {
        ride_id: rideId,
        driver_id: driverId
      }
    });
    return !!existing;
  }

  /**
   * Get driver incentives total for today (cap enforcement)
   */
  private async getDriverIncentivesToday(driverId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await prisma.driver_incentives.aggregate({
      where: {
        driver_id: driverId,
        applied_at: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: { value: true }
    });

    return parseFloat(result._sum.value?.toString() || '0');
  }

  /**
   * Persist incentive record
   */
  private async persistIncentive(application: IncentiveApplication): Promise<void> {
    await prisma.driver_incentives.create({
      data: {
        id: `incentive_${application.rideId}_${Date.now()}`,
        ride_id: application.rideId,
        driver_id: application.driverId,
        community_id: application.communityId,
        operational_profile: application.operationalProfile,
        incentive_type: application.incentiveType,
        value: application.value,
        currency: 'BRL'
      }
    });
  }

  /**
   * Get incentives for a ride (for reporting/audit)
   */
  async getRideIncentives(rideId: string) {
    return prisma.driver_incentives.findMany({
      where: { ride_id: rideId },
      orderBy: { applied_at: 'desc' }
    });
  }
}
