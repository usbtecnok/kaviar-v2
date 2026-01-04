import { prisma } from '../../config/database';
import { GeofenceService } from '../../services/geofence';
import { DiamondService } from '../../services/diamond';
import { config } from '../../config';

export interface RideRequestData {
  passengerId: string;
  origin: string;
  destination: string;
  type: 'normal' | 'combo' | 'comunidade' | 'TOURISM';
  price: number;
  acceptOutOfFence?: boolean;
  passengerLat?: number;
  passengerLng?: number;
}

export interface RideRequestResult {
  success: boolean;
  ride?: any;
  requiresOutOfFenceConfirmation?: boolean;
  geofenceInfo?: {
    driversInFence: number;
    driversOutOfFence: number;
    passengerWithinFence: boolean;
    fallbackAvailable: boolean;
  };
  error?: string;
}

export class RideService {
  private geofenceService = new GeofenceService();
  private diamondService = new DiamondService();

  /**
   * Request a ride with optional geofence validation
   */
  async requestRide(data: RideRequestData): Promise<RideRequestResult> {
    // For non-community rides or when geofence is disabled, use legacy behavior
    if (data.type !== 'comunidade') {
      return this.createRideLegacy(data);
    }

    // Check geofence for community rides (single source of truth)
    const geofenceCheck = await this.geofenceService.checkCommunityRideGeofence(
      data.passengerId,
      data.passengerLat,
      data.passengerLng
    );

    // Update passenger location if provided
    if (data.passengerLat && data.passengerLng) {
      await this.geofenceService.updatePassengerLocation(
        data.passengerId, 
        data.passengerLat, 
        data.passengerLng
      );
    }

    // If blocked, return error
    if (!geofenceCheck.canCreateCommunityRide && !geofenceCheck.requiresOutOfFenceConfirmation) {
      return {
        success: false,
        error: geofenceCheck.blockReason || 'Não é possível criar corrida comunidade',
        geofenceInfo: geofenceCheck.geofenceInfo
      };
    }

    // If requires confirmation and not provided, ask for confirmation
    if (geofenceCheck.requiresOutOfFenceConfirmation && !data.acceptOutOfFence) {
      return {
        success: false,
        requiresOutOfFenceConfirmation: true,
        geofenceInfo: geofenceCheck.geofenceInfo
      };
    }

    // If passenger accepted out-of-fence fallback, create fallback ride
    if (geofenceCheck.requiresOutOfFenceConfirmation && data.acceptOutOfFence) {
      const ride = await this.createFallbackRide(data, geofenceCheck.geofenceInfo);
      return {
        success: true,
        ride,
        geofenceInfo: geofenceCheck.geofenceInfo
      };
    }

    // Normal community ride (drivers available within fence)
    const ride = await this.createCommunityRide(data, geofenceCheck.geofenceInfo);
    return {
      success: true,
      ride,
      geofenceInfo: geofenceCheck.geofenceInfo
    };
  }

  /**
   * Create legacy ride (no geofence validation)
   */
  private async createRideLegacy(data: RideRequestData) {
    const ride = await prisma.ride.create({
      data: {
        passengerId: data.passengerId,
        origin: data.origin,
        destination: data.destination,
        type: data.type,
        price: data.price,
        status: 'requested'
      }
    });

    return { success: true, ride };
  }

  /**
   * Create community ride (within fence)
   */
  private async createCommunityRide(data: RideRequestData, geofenceInfo: any) {
    const ride = await prisma.ride.create({
      data: {
        passengerId: data.passengerId,
        origin: data.origin,
        destination: data.destination,
        type: 'comunidade',
        price: data.price,
        status: 'requested',
        fallbackOutOfFence: false,
        driversInFenceCount: geofenceInfo.driversInFence
      }
    });

    // Initialize diamond for community rides
    const passenger = await prisma.passenger.findUnique({
      where: { id: data.passengerId },
      select: { communityId: true }
    });
    
    await this.diamondService.initializeDiamond(ride.id, 'comunidade', passenger?.communityId || undefined);
    
    return ride;
  }

  /**
   * Create fallback ride (out of fence, converted to normal)
   */
  private async createFallbackRide(data: RideRequestData, geofenceInfo: any) {
    return prisma.ride.create({
      data: {
        passengerId: data.passengerId,
        origin: data.origin,
        destination: data.destination,
        type: 'normal', // Convert to normal ride
        price: data.price,
        status: 'requested',
        fallbackOutOfFence: true,
        fallbackReason: 'NO_DRIVERS_IN_FENCE',
        passengerConfirmedAt: new Date(),
        driversInFenceCount: 0
      }
    });
  }

  /**
   * Create out-of-fence ride (confirmed fallback)
   */
  async createOutOfFenceRide(rideData: any): Promise<any> {
    // Create ride without geofence restrictions
    const ride = await prisma.ride.create({
      data: {
        passengerId: rideData.passengerId,
        origin: rideData.origin,
        destination: rideData.destination,
        type: 'normal', // Convert to normal ride for fallback
        price: rideData.price,
        status: 'requested',
        fallbackOutOfFence: true,
        fallbackReason: 'NO_DRIVERS_IN_FENCE',
        passengerConfirmedAt: new Date(),
        driversInFenceCount: 0
      }
    });

    return ride;
  }
}
