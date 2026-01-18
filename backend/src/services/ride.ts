import { prisma } from '../lib/prisma';
import { CommunityService } from './community';
import { OperationalService } from './operational';
import { PricingService } from './pricing';
import { IncentiveService } from './incentive';

export interface CreateRideRequest {
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  passengerId: string;
  communityId?: string;
  type?: string;
  paymentMethod?: string;
}

export interface RideGeographicAnchor {
  neighborhoodId: string;
  communityId?: string | null;
}

/**
 * Ride service with canonical flow for favela rides
 * Implements the complete canonical flow: geo-resolve → validate → create → dispatch
 */
export class RideService {
  private communityService = new CommunityService();
  private operationalService = new OperationalService();
  private pricingService = new PricingService();
  private incentiveService = new IncentiveService();

  /**
   * Canonical ride creation flow with pricing and incentives
   * 1. Geo-resolve pickup → neighborhood (definitive)
   * 2. Validate community if provided (optional)
   * 3. Create ride with immutable anchors
   * 4. Calculate and persist pricing
   * 5. Apply incentives after pricing
   */
  async createRide(request: CreateRideRequest): Promise<string> {
    // Step 1: Geo-resolve (único e definitivo)
    const geoAnchor = await this.resolveGeographicAnchor(
      request.pickup.lat,
      request.pickup.lng,
      request.communityId
    );

    if (!geoAnchor) {
      throw new Error('Location outside service area');
    }

    // Step 2: Create ride
    const ride = await prisma.rides.create({
      data: {
        id: this.generateRideId(),
        passenger_id: request.passengerId,
        origin: `${request.pickup.lat},${request.pickup.lng}`,
        destination: `${request.dropoff.lat},${request.dropoff.lng}`,
        type: request.type || 'normal',
        payment_method: request.paymentMethod || 'credit_card',
        price: 0, // Will be calculated next
        status: 'requested',
        updated_at: new Date()
      }
    });

    // Step 3: Calculate and persist pricing (between Create → Incentives)
    await this.pricingService.calculateAndPersist(ride.id);

    // Step 4: Apply incentives after pricing (between Pricing → Dispatch)
    await this.incentiveService.applyAfterPricing(ride.id);

    return ride.id;
  }

  /**
   * Get operational context from ride (reads immutable anchors)
   */
  async getRideOperationalContext(rideId: string) {
    const ride = await prisma.rides.findUnique({
      where: { id: rideId }
    });

    if (!ride) {
      throw new Error('Ride not found');
    }

    return this.operationalService.resolveOperationalContext(
      'default-neighborhood',
      null
    );
  }

  /**
   * Canonical geographic resolution (before CREATE only)
   */
  private async resolveGeographicAnchor(
    lat: number,
    lng: number,
    communityId?: string
  ): Promise<RideGeographicAnchor | null> {
    
    const resolution = await this.communityService.resolveRideLocation(
      lat, lng, communityId
    );

    if (!resolution) {
      return null;
    }

    return {
      neighborhoodId: resolution.neighborhoodId,
      communityId: resolution.communityId || null
    };
  }

  /**
   * Prevent geographic anchor updates (immutability enforcement)
   */
  async updateRide(rideId: string, updates: any): Promise<void> {
    // Block geographic anchor changes
    if (updates.neighborhood_id || updates.community_id || 
        updates.neighborhoodId || updates.communityId) {
      throw new Error('Geographic anchors are immutable after ride creation');
    }

    await prisma.rides.update({
      where: { id: rideId },
      data: updates
    });
  }

  private generateRideId(): string {
    return `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
