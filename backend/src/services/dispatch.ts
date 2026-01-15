import { prisma } from '../config/database';
import { OperationalService, OperationalProfile } from './operational';

export interface DispatchResult {
  success: boolean;
  driverIds?: string[];
  reason?: string;
}

/**
 * Dispatch service - canonical driver selection with operational profiles
 * Implements the 4 canonical profiles: NORMAL, RESTRICTED, PRIORITY, PRIVATE
 */
export class DispatchService {
  private operationalService = new OperationalService();

  /**
   * Dispatch drivers for ride based on operational profile
   * Profile defines HOW to select drivers (not WHERE)
   */
  async dispatchDrivers(rideId: string): Promise<DispatchResult> {
    // Get ride
    const ride = await prisma.rides.findUnique({
      where: { id: rideId }
    });

    if (!ride) {
      return { success: false, reason: 'Ride not found' };
    }

    // Get operational context (without neighborhood/community)
    const context = await this.operationalService.resolveOperationalContext(
      'default-neighborhood',
      null
    );

    // Base query: active drivers
    const baseQuery = {
      where: {
        status: 'active',
        // Add filter logic here
        //  context.neighborhoodId
      }
    };

    // Apply operational rules
    const dispatchQuery = this.operationalService.applyDispatchRules(
      baseQuery,
      context
    );

    // Execute dispatch
    const availableDrivers = await prisma.drivers.findMany(dispatchQuery);

    // Handle operational profile results
    return this.handleDispatchResult(
      availableDrivers,
      context.operationalProfile
    );
  }

  /**
   * Handle dispatch results based on operational profile
   */
  private handleDispatchResult(
    drivers: any[],
    profile: OperationalProfile
  ): DispatchResult {
    
    if (drivers.length === 0) {
      // Only PRIVATE can fail operationally
      if (profile === 'PRIVATE') {
        return {
          success: false,
          reason: 'NO_DRIVER_AVAILABLE'
        };
      }
      
      // Other profiles never block (ride will timeout naturally)
      return {
        success: true,
        driverIds: [],
        reason: 'No drivers available but ride remains active'
      };
    }

    return {
      success: true,
      driverIds: drivers.map(d => d.id)
    };
  }

  /**
   * Update ride status based on dispatch result
   */
  async updateRideStatus(rideId: string, dispatchResult: DispatchResult): Promise<void> {
    if (!dispatchResult.success && dispatchResult.reason === 'NO_DRIVER_AVAILABLE') {
      await prisma.rides.update({
        where: { id: rideId },
        data: { status: 'no_driver_available' }
      });
    }
    // Other cases: ride remains in current status for normal timeout/retry logic
  }
}
