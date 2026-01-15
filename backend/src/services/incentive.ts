import { prisma } from '../config/database';

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
 * 
 * TODO: This service depends on removed models (ride_pricing, driver_incentives)
 * All methods are currently disabled and return empty/default values
 * Needs refactoring to work with current schema
 */
export class IncentiveService {

  /**
   * Apply incentives after pricing calculation
   * TODO: Disabled - ride_pricing model removed
   */
  async applyAfterPricing(rideId: string): Promise<IncentiveApplication[]> {
    return [];
  }

  /**
   * Get operational profile for community
   * TODO: operational_profile field removed from communities
   */
  private async getOperationalProfile(communityId: string): Promise<string> {
    const community = await prisma.communities.findUnique({
      where: { id: communityId }
    });
    return community?.description || 'NORMAL';
  }

  /**
   * Check if driver already has incentive for this ride
   * TODO: driver_incentives model removed
   */
  private async checkExistingIncentive(rideId: string, driverId: string): Promise<boolean> {
    return false;
  }

  /**
   * Get driver incentives total for today
   * TODO: driver_incentives model removed
   */
  private async getDriverIncentivesToday(driverId: string): Promise<number> {
    return 0;
  }

  /**
   * Persist incentive application
   * TODO: driver_incentives model removed
   */
  private async persistIncentive(application: IncentiveApplication): Promise<void> {
    return;
  }

  /**
   * Get driver incentive history
   * TODO: driver_incentives model removed
   */
  async getDriverIncentiveHistory(driverId: string, limit: number = 50) {
    return [];
  }
}
