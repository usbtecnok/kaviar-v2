import { prisma } from '../config/database';
import { config } from '../config';
import { RideConfirmationService } from './ride-confirmation';

export interface GeofenceValidationResult {
  isWithinFence: boolean;
  distance: number; // meters
  communityCenter: { lat: number; lng: number };
  radiusMeters: number;
}

export interface AvailableDriversResult {
  driversInFence: number;
  driversOutOfFence: number;
  availableDrivers: Array<{
    id: string;
    name: string;
    distance: number;
    isWithinFence: boolean;
  }>;
}

export interface RideGeofenceCheck {
  canCreateCommunityRide: boolean;
  requiresOutOfFenceConfirmation: boolean;
  geofenceInfo: {
    passengerWithinFence: boolean;
    driversInFence: number;
    driversOutOfFence: number;
    fallbackAvailable: boolean;
  };
  blockReason?: string;
}

export class GeofenceService {
  private confirmationService = new RideConfirmationService();
  
  /**
   * Check if geofence is enabled
   */
  private isGeofenceEnabled(): boolean {
    return config.geofence.enableGeofence;
  }

  /**
   * Handle out-of-fence fallback with confirmation token
   */
  async handleOutOfFenceFallback(passengerId: string, rideData: any) {
    const hasDrivers = await this.hasAnyAvailableDrivers();
    
    if (!hasDrivers) {
      throw new Error('Nenhum motorista disponível no momento');
    }

    return await this.confirmationService.generateConfirmationToken(passengerId, rideData);
  }

  /**
   * Process confirmed out-of-fence ride
   */
  async processConfirmedRide(confirmationToken: string, passengerId: string, currentRequest?: any) {
    const validation = await this.confirmationService.validateAndUseToken(
      confirmationToken,
      passengerId
    );

    if (!validation.isValid) {
      throw new Error(validation.error || 'Token inválido');
    }

    if (validation.isUsed && validation.existingRideId) {
      // Return existing ride (idempotent)
      return { rideId: validation.existingRideId, isExisting: true };
    }

    // Get original ride data
    const rideData = await this.confirmationService.getConfirmationData(confirmationToken);
    if (!rideData) {
      throw new Error('Dados da corrida não encontrados');
    }

    // Validate request matches original (if current request provided)
    if (currentRequest && !this.confirmationService.validateRequestMatch(rideData, currentRequest)) {
      throw new Error('Confirmação não corresponde ao pedido original');
    }

    return { rideData, confirmationToken, isExisting: false };
  }

  /**
   * Mark confirmation as used after ride creation
   */
  async markConfirmationUsed(confirmationToken: string, rideId: string) {
    await this.confirmationService.markTokenAsUsed(confirmationToken, rideId);
  }

  /**
   * Check if there are any available drivers system-wide
   */
  private async hasAnyAvailableDrivers(): Promise<boolean> {
    const locationValidityMs = config.geofence.locationValidityMinutes * 60 * 1000;
    const locationValidityTime = new Date(Date.now() - locationValidityMs);

    const count = await prisma.driver.count({
      where: {
        status: 'approved',
        suspendedAt: null,
        lastLocationUpdatedAt: {
          gte: locationValidityTime
        },
        rides: {
          none: {
            status: {
              in: ['accepted', 'arrived', 'started']
            }
          }
        }
      }
    });

    return count > 0;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateHaversineDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Validate if a point is within community geofence
   */
  async validateGeofence(
    communityId: string, 
    lat: number, 
    lng: number
  ): Promise<GeofenceValidationResult> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { 
        centerLat: true, 
        centerLng: true, 
        radiusMeters: true 
      }
    });

    if (!community || !community.centerLat || !community.centerLng) {
      throw new Error('Comunidade não possui geofence configurada');
    }

    const distance = this.calculateHaversineDistance(
      Number(community.centerLat),
      Number(community.centerLng),
      lat,
      lng
    );

    const radiusMeters = community.radiusMeters || 5000;
    const isWithinFence = distance <= radiusMeters;

    return {
      isWithinFence,
      distance,
      communityCenter: {
        lat: Number(community.centerLat),
        lng: Number(community.centerLng)
      },
      radiusMeters
    };
  }

  /**
   * Find available drivers within and outside geofence
   * Available = approved + not suspended + not occupied + recent location (<= 5 min)
   */
  async findAvailableDrivers(communityId: string): Promise<AvailableDriversResult> {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { 
        centerLat: true, 
        centerLng: true, 
        radiusMeters: true 
      }
    });

    if (!community || !community.centerLat || !community.centerLng) {
      return {
        driversInFence: 0,
        driversOutOfFence: 0,
        availableDrivers: []
      };
    }

    // Calculate validity window for location
    const locationValidityMs = config.geofence.locationValidityMinutes * 60 * 1000;
    const locationValidityTime = new Date(Date.now() - locationValidityMs);
    
    // Find available drivers with recent location
    const drivers = await prisma.driver.findMany({
      where: {
        communityId,
        status: 'approved',
        suspendedAt: null,
        lastLocationUpdatedAt: {
          gte: locationValidityTime
        },
        lastLat: { not: null },
        lastLng: { not: null },
        // Not occupied (no active rides)
        rides: {
          none: {
            status: {
              in: ['accepted', 'arrived', 'started']
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        lastLat: true,
        lastLng: true
      }
    });

    const radiusMeters = community.radiusMeters || 5000;
    const availableDrivers = drivers.map(driver => {
      const distance = this.calculateHaversineDistance(
        Number(community.centerLat),
        Number(community.centerLng),
        Number(driver.lastLat),
        Number(driver.lastLng)
      );

      return {
        id: driver.id,
        name: driver.name,
        distance,
        isWithinFence: distance <= radiusMeters
      };
    });

    const driversInFence = availableDrivers.filter(d => d.isWithinFence).length;
    const driversOutOfFence = availableDrivers.filter(d => !d.isWithinFence).length;

    return {
      driversInFence,
      driversOutOfFence,
      availableDrivers
    };
  }

  /**
   * Main geofence check for community ride requests
   * Single source of truth for all geofence logic
   */
  async checkCommunityRideGeofence(
    passengerId: string,
    passengerLat?: number,
    passengerLng?: number
  ): Promise<RideGeofenceCheck> {
    // If geofence is disabled, allow all community rides
    if (!this.isGeofenceEnabled()) {
      return {
        canCreateCommunityRide: true,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: true,
          driversInFence: 0,
          driversOutOfFence: 0,
          fallbackAvailable: false
        }
      };
    }

    // Get passenger's community
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { communityId: true, lastLat: true, lastLng: true }
    });

    if (!passenger || !passenger.communityId) {
      return {
        canCreateCommunityRide: false,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: false,
          driversInFence: 0,
          driversOutOfFence: 0,
          fallbackAvailable: false
        },
        blockReason: 'Passageiro não possui comunidade atribuída'
      };
    }

    // Use provided coordinates (required when geofence is enabled)
    const lat = passengerLat;
    const lng = passengerLng;

    if (!lat || !lng) {
      return {
        canCreateCommunityRide: false,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: false,
          driversInFence: 0,
          driversOutOfFence: 0,
          fallbackAvailable: false
        },
        blockReason: 'Coordenadas do passageiro são obrigatórias para corridas comunidade'
      };
    }

    // Validate passenger is within geofence
    let passengerGeofence;
    try {
      passengerGeofence = await this.validateGeofence(passenger.communityId, lat, lng);
    } catch (error) {
      return {
        canCreateCommunityRide: false,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: false,
          driversInFence: 0,
          driversOutOfFence: 0,
          fallbackAvailable: false
        },
        blockReason: 'Comunidade não possui geofence configurada'
      };
    }

    // If passenger is outside fence, block community ride
    if (!passengerGeofence.isWithinFence) {
      return {
        canCreateCommunityRide: false,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: false,
          driversInFence: 0,
          driversOutOfFence: 0,
          fallbackAvailable: false
        },
        blockReason: 'Passageiro fora da área de cobertura da comunidade'
      };
    }

    // Find available drivers
    const driversInfo = await this.findAvailableDrivers(passenger.communityId);

    // If there are drivers within fence, allow normal community ride
    if (driversInfo.driversInFence > 0) {
      return {
        canCreateCommunityRide: true,
        requiresOutOfFenceConfirmation: false,
        geofenceInfo: {
          passengerWithinFence: true,
          driversInFence: driversInfo.driversInFence,
          driversOutOfFence: driversInfo.driversOutOfFence,
          fallbackAvailable: false
        }
      };
    }

    // No drivers within fence - offer fallback (immediate, no wait)
    return {
      canCreateCommunityRide: false,
      requiresOutOfFenceConfirmation: true,
      geofenceInfo: {
        passengerWithinFence: true,
        driversInFence: 0,
        driversOutOfFence: driversInfo.driversOutOfFence,
        fallbackAvailable: driversInfo.driversOutOfFence > 0
      }
    };
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocationUpdatedAt: new Date()
      }
    });
  }

  /**
   * Update passenger location
   */
  async updatePassengerLocation(passengerId: string, lat: number, lng: number): Promise<void> {
    await prisma.passenger.update({
      where: { id: passengerId },
      data: {
        lastLat: lat,
        lastLng: lng,
        lastLocationUpdatedAt: new Date()
      }
    });
  }
}
