import { PrismaClient } from '@prisma/client';
import { CommunityService } from './community';

const prisma = new PrismaClient();

export interface CreateRideRequest {
  passengerId: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  communityId?: string;
  type?: string;
  paymentMethod?: string;
}

export interface RideGeographicAnchor {
  neighborhoodId: string;
  communityId?: string | null;
}

/**
 * Ride service with canonical geographic resolution
 * Ensures immutable geographic anchors (neighborhood + optional community)
 */
export class RideService {
  private communityService = new CommunityService();

  /**
   * Create ride with canonical geographic resolution
   * 1. Resolve lat/lng → neighborhoodId (always required)
   * 2. Validate communityId if provided
   * 3. Persist with immutable geographic anchors
   */
  async createRide(request: CreateRideRequest): Promise<string> {
    // Step 1: Resolve geographic anchors BEFORE creation
    const geoAnchor = await this.resolveGeographicAnchor(
      request.originLat,
      request.originLng,
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
        neighborhood_id: geoAnchor.neighborhoodId, // OBRIGATÓRIO
        community_id: geoAnchor.communityId,       // OPCIONAL
        origin: request.origin,
        destination: request.destination,
        type: request.type || 'normal',
        payment_method: request.paymentMethod || 'credit_card',
        price: 0, // Will be calculated later
        status: 'requested'
      }
    });

    return ride.id;
  }

  /**
   * Canonical geographic resolution
   * Returns immutable anchors for ride persistence
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
