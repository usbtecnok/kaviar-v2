import { PrismaClient } from '@prisma/client';
import { CommunityService } from './community';
import { OperationalService } from './operational';
import { PricingService } from './pricing';

const prisma = new PrismaClient();

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

  /**
   * Canonical ride creation flow with pricing
   * 1. Geo-resolve pickup → neighborhood (definitive)
   * 2. Validate community if provided (optional)
   * 3. Create ride with immutable anchors
   * 4. Calculate and persist pricing
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

    // Step 2: Create ride with immutable anchors
    const ride = await prisma.rides.create({
      data: {
        id: this.generateRideId(),
        passenger_id: request.passengerId,
        neighborhood_id: geoAnchor.neighborhoodId, // sempre
        community_id: geoAnchor.communityId,       // se válida
        origin: `${request.pickup.lat},${request.pickup.lng}`,
        destination: `${request.dropoff.lat},${request.dropoff.lng}`,
        type: request.type || 'normal',
        payment_method: request.paymentMethod || 'credit_card',
        price: 0, // Will be calculated next
        status: 'requested',
        updated_at: new Date()
      }
    });

    // Step 3: Calculate and persist pricing (between Create → Dispatch)
    await this.pricingService.calculateAndPersist(ride.id);

    return ride.id;
  }

  /**
   * Get operational context from ride (reads immutable anchors)
   */
  async getRideOperationalContext(rideId: string) {
    const ride = await prisma.rides.findUnique({
      where: { id: rideId },
      select: {
        neighborhood_id: true,
        community_id: true
      }
    });

    if (!ride) {
      throw new Error('Ride not found');
    }

    return this.operationalService.resolveOperationalContext(
      ride.neighborhood_id,
      ride.community_id
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
