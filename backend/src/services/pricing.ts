import { prisma } from '../config/database';

export interface PricingModifier {
  type: 'PRIORITY_BONUS' | 'RESTRICTED_SURCHARGE' | 'PRIVATE_FIXED';
  value: number;
  description: string;
}

export interface PricingCalculation {
  baseFare: number;
  distanceKm: number;
  durationMin: number;
  modifiers: PricingModifier[];
  finalFare: number;
  driverPayout: number;
  platformFee: number;
}

/**
 * Pricing service - calculates and persists ride pricing
 * Always anchored to Ride.neighborhoodId with optional community modifiers
 */
export class PricingService {

  /**
   * Calculate and persist pricing for a ride
   * Called between Create → Dispatch without altering flow
   */
  async calculateAndPersist(rideId: string): Promise<PricingCalculation> {
    // Get ride with immutable anchors
    const ride = await prisma.rides.findUnique({
      where: { id: rideId },
      select: {
        neighborhood_id: true,
        community_id: true,
        origin: true,
        destination: true
      }
    });

    if (!ride) {
      throw new Error('Ride not found');
    }

    // Get pricing table for neighborhood
    const pricingTable = await this.getPricingTable(ride.neighborhood_id);
    
    // Calculate base pricing
    const { distanceKm, durationMin } = await this.estimateRideMetrics(
      ride.origin, 
      ride.destination
    );

    const baseFare = parseFloat(pricingTable.base_fare.toString());
    const perKm = parseFloat(pricingTable.per_km.toString());
    const perMin = parseFloat(pricingTable.per_min.toString());
    const minimumFare = parseFloat(pricingTable.minimum_fare.toString());

    let calculatedFare = baseFare + (distanceKm * perKm) + (durationMin * perMin);
    calculatedFare = Math.max(calculatedFare, minimumFare);

    // Apply community modifiers if applicable
    const modifiers = await this.getModifiers(ride.community_id, calculatedFare);
    const finalFare = this.applyModifiers(calculatedFare, modifiers);

    // Calculate payouts (driver gets ~85%, platform ~15%)
    const driverPayout = finalFare * 0.85;
    const platformFee = finalFare - driverPayout;

    const calculation: PricingCalculation = {
      baseFare,
      distanceKm,
      durationMin,
      modifiers,
      finalFare,
      driverPayout,
      platformFee
    };

    // Persist immutable pricing record
    await this.persistPricing(rideId, ride, pricingTable, calculation);

    return calculation;
  }

  /**
   * Get active pricing table for neighborhood
   */
  private async getPricingTable(neighborhoodId: string) {
    const pricingTable = await prisma.pricing_tables.findFirst({
      where: {
        neighborhood_id: neighborhoodId,
        is_active: true
      },
      orderBy: { created_at: 'desc' }
    });

    if (!pricingTable) {
      throw new Error(`No active pricing table for neighborhood: ${neighborhoodId}`);
    }

    return pricingTable;
  }

  /**
   * Get community modifiers based on operational profile
   */
  private async getModifiers(
    communityId?: string | null, 
    baseFare?: number
  ): Promise<PricingModifier[]> {
    if (!communityId) {
      return []; // NORMAL - no modifiers
    }

    const community = await prisma.communities.findFirst({
      where: { id: communityId, is_active: true }
    });

    if (!community) {
      return []; // Invalid community - no modifiers
    }

    const modifiers: PricingModifier[] = [];

    switch (community.operational_profile) {
      case 'PRIORITY':
        // Light discount for passenger OR bonus for driver
        modifiers.push({
          type: 'PRIORITY_BONUS',
          value: -2.00, // R$ 2 discount
          description: 'Community priority discount'
        });
        break;

      case 'RESTRICTED':
        // Light surcharge for operational cost
        modifiers.push({
          type: 'RESTRICTED_SURCHARGE',
          value: 3.00, // R$ 3 surcharge
          description: 'Restricted area operational cost'
        });
        break;

      case 'PRIVATE':
        // Fixed price if configured (placeholder)
        if (baseFare && baseFare > 15) {
          modifiers.push({
            type: 'PRIVATE_FIXED',
            value: 15.00 - baseFare, // Fixed R$ 15
            description: 'Private community fixed rate'
          });
        }
        break;

      case 'NORMAL':
      default:
        // No modifiers
        break;
    }

    return modifiers;
  }

  /**
   * Apply modifiers to calculated fare
   */
  private applyModifiers(baseFare: number, modifiers: PricingModifier[]): number {
    return modifiers.reduce((fare, modifier) => {
      return fare + modifier.value;
    }, baseFare);
  }

  /**
   * Persist immutable pricing record
   */
  private async persistPricing(
    rideId: string,
    ride: any,
    pricingTable: any,
    calculation: PricingCalculation
  ): Promise<void> {
    await prisma.ride_pricing.create({
      data: {
        id: `pricing_${rideId}`,
        ride_id: rideId,
        pricing_version: pricingTable.version,
        neighborhood_id: ride.neighborhood_id,
        community_id: ride.community_id,
        base_fare: calculation.baseFare,
        distance_km: calculation.distanceKm,
        duration_min: calculation.durationMin,
        modifiers: JSON.stringify(calculation.modifiers),
        final_fare: calculation.finalFare,
        driver_payout: calculation.driverPayout,
        platform_fee: calculation.platformFee
      }
    });

    // Update ride with final price
    await prisma.rides.update({
      where: { id: rideId },
      data: { price: calculation.finalFare }
    });
  }

  /**
   * Estimate ride metrics (placeholder - would use routing service)
   */
  private async estimateRideMetrics(
    origin: string, 
    destination: string
  ): Promise<{ distanceKm: number; durationMin: number }> {
    // Placeholder estimation - in real implementation would use routing API
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);
    
    // Simple distance calculation (Haversine approximation)
    const distanceKm = this.calculateDistance(originLat, originLng, destLat, destLng);
    const durationMin = Math.max(5, Math.round(distanceKm * 3)); // ~20km/h average

    return { distanceKm, durationMin };
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
