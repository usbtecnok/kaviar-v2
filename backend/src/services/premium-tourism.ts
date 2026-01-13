import { prisma } from '../config/database';
import { config } from '../config';
import { FeatureDisabledError } from '../errors/FeatureDisabledError';
import { CreateTourBookingData } from '../modules/governance/tour-schemas';
import { 
  TourPackageData, 
  TourBookingData, 
  TourPackageResponse, 
  TourBookingResponse,
  TourBookingStatus,
  PremiumDriverAvailability 
} from '../types/premium-tourism';

export class StatusTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid status transition from ${from} to ${to}`);
    this.name = 'StatusTransitionError';
  }
}

export class PremiumTourismService {

  /**
   * Check if premium tourism is enabled
   */
  private isPremiumTourismEnabled(): boolean {
    return config.premiumTourism.enablePremiumTourism;
  }

  /**
   * Create tour package (admin only)
   */
  async createTourPackage(data: TourPackageData, adminId: string): Promise<TourPackageResponse> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    const tourPackage = await prisma.tourPackage.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        partnerName: data.partnerName,
        basePrice: data.basePrice,
        locations: data.locations,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        createdBy: adminId
      }
    });

    // Audit log
    console.log(`[TOUR_PACKAGE_CREATED] AdminId: ${adminId}, PackageId: ${tourPackage.id}, Title: "${data.title}"`);

    return this.mapTourPackageResponse(tourPackage);
  }

  /**
   * Get all tour packages (admin)
   */
  async getAllTourPackages(page = 1, limit = 20): Promise<{ packages: any[]; total: number }> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    const skip = (page - 1) * limit;

    const [packages, total] = await Promise.all([
      prisma.tourPackage.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bookings: true }
          }
        }
      }),
      prisma.tourPackage.count()
    ]);

    return {
      packages: packages.map(pkg => ({
        ...this.mapTourPackageResponse(pkg),
        bookingsCount: pkg._count.bookings
      })),
      total
    };
  }

  /**
   * Get active tour packages (public)
   */
  async getActiveTourPackages(): Promise<TourPackageResponse[]> {
    if (!this.isPremiumTourismEnabled()) {
      return [];
    }

    const packages = await prisma.tourPackage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return packages.map(this.mapTourPackageResponse);
  }

  /**
   * Update tour package (admin only)
   */
  async updateTourPackage(id: string, data: Partial<TourPackageData>, adminId: string): Promise<TourPackageResponse> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    const tourPackage = await prisma.tourPackage.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    // Audit log
    console.log(`[TOUR_PACKAGE_UPDATED] AdminId: ${adminId}, PackageId: ${id}`);

    return this.mapTourPackageResponse(tourPackage);
  }

  /**
   * Deactivate tour package (admin only)
   */
  async deactivateTourPackage(id: string, adminId: string): Promise<void> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    await prisma.tourPackage.update({
      where: { id },
      data: { isActive: false }
    });

    // Audit log
    console.log(`[TOUR_PACKAGE_DEACTIVATED] AdminId: ${adminId}, PackageId: ${id}`);
  }

  /**
   * Create tour booking (public)
   */
  async createTourBooking(data: CreateTourBookingData): Promise<{ booking: any; premiumDriversAvailable: number }> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    // Validate package exists and is active
    const tourPackage = await prisma.tourPackage.findFirst({
      where: { id: data.tourPackageId, isActive: true }
    });

    if (!tourPackage) {
      throw new Error('Tour package not found or inactive');
    }

    // Calculate total price
    const totalPrice = Number(tourPackage.basePrice) * data.passengerCount;

    // Check premium drivers availability
    const availability = await this.checkPremiumDriverAvailability();

    const booking = await prisma.tourBooking.create({
      data: {
        packageId: data.tourPackageId,
        passengerName: data.passengerName,
        passengerEmail: data.passengerEmail,
        passengerPhone: data.passengerPhone,
        passengerCount: data.passengerCount,
        scheduledDate: data.scheduledDate,
        specialRequests: data.specialRequests,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        totalPrice: totalPrice,
        status: TourBookingStatus.REQUESTED
      },
      include: {
        package: true
      }
    });

    // Audit log
    console.log(`[TOUR_BOOKING_CREATED] BookingId: ${booking.id}, PackageId: ${data.tourPackageId}, Passenger: ${data.passengerName}`);

    return {
      booking: {
        id: booking.id,
        packageTitle: booking.package.title,
        passengerName: booking.passengerName || 'N/A',
        scheduledDate: booking.scheduledDate,
        status: booking.status,
        totalPrice: booking.totalPrice,
        createdAt: booking.createdAt
      },
      premiumDriversAvailable: availability.available
    };
  }

  /**
   * Confirm tour booking (admin only) - Creates ride
   * TODO: Implementar após ajustar schema de Ride
   */
  async confirmTourBooking(bookingId: string, adminId: string): Promise<{ booking: any; rideId?: string }> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    // Simplified version - just update status for now
    const booking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: {
        status: TourBookingStatus.CONFIRMED,
        confirmedBy: adminId,
        confirmedAt: new Date()
      },
      include: { package: true }
    });

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        confirmedAt: booking.confirmedAt
      }
    };
  }

  /**
   * Confirm tour booking (admin only) - Creates ride
   * TODO: Implementar após ajustar schema de Ride
   */
  async confirmTourBooking(bookingId: string, adminId: string): Promise<{ booking: any; rideId?: string }> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    // Simplified version - just update status for now
    const booking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: {
        status: TourBookingStatus.CONFIRMED,
        confirmedBy: adminId,
        confirmedAt: new Date()
      },
      include: { package: true }
    });

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        confirmedAt: booking.confirmedAt
      }
    };
  }

  /**
   * Get all tour bookings (admin)
   */
  async getAllTourBookings(page = 1, limit = 20): Promise<{ bookings: any[]; total: number }> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.tourBooking.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: { select: { title: true } },
          passenger: { select: { name: true } }
        }
      }),
      prisma.tourBooking.count()
    ]);

    return {
      bookings: bookings.map(booking => ({
        id: booking.id,
        packageTitle: booking.package.title,
        passengerName: booking.passengerName || booking.passenger?.name || 'N/A',
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        pickupLocation: booking.pickupLocation,
        createdAt: booking.createdAt
      })),
      total
    };
  }

  /**
   * Check premium driver availability
   */
  async checkPremiumDriverAvailability(): Promise<PremiumDriverAvailability> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Premium drivers: isPremium=true OR premiumOverride=true
    // + approved + not suspended + recent location
    const availableCount = await prisma.driver.count({
      where: {
        OR: [
          { isPremium: true },
          { premiumOverride: true }
        ],
        status: 'approved',
        suspendedAt: null,
        lastLocationUpdatedAt: {
          gte: fiveMinutesAgo
        },
        // Not occupied (no active rides)
        rides: {
          none: {
            status: {
              in: ['accepted', 'arrived', 'started']
            }
          }
        }
      }
    });

    const totalPremium = await prisma.driver.count({
      where: {
        OR: [
          { isPremium: true },
          { premiumOverride: true }
        ]
      }
    });

    return {
      available: availableCount,
      total: totalPremium,
      hasAvailable: availableCount > 0
    };
  }

  /**
   * Update driver premium status based on rating criteria
   */
  async updateDriverPremiumStatus(driverId: string): Promise<boolean> {
    if (!this.isPremiumTourismEnabled()) {
      return false;
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { premiumOverride: true }
    });

    if (!driver) return false;

    // Override always wins
    if (driver.premiumOverride) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { isPremium: true }
      });
      return true;
    }

    // Check rating criteria
    const stats = await prisma.ratingStats.findUnique({
      where: { userId: driverId }
    });

    const meetsRatingCriteria = stats && 
      parseFloat(stats.averageRating.toString()) >= config.premiumTourism.minRatingPremium &&
      stats.totalRatings >= config.premiumTourism.minRatingsCountPremium;

    await prisma.driver.update({
      where: { id: driverId },
      data: { isPremium: meetsRatingCriteria || false }
    });

    return meetsRatingCriteria || false;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(from: TourBookingStatus, to: TourBookingStatus): void {
    const validTransitions: Record<TourBookingStatus, TourBookingStatus[]> = {
      [TourBookingStatus.REQUESTED]: [TourBookingStatus.CONFIRMED, TourBookingStatus.CANCELLED],
      [TourBookingStatus.CONFIRMED]: [TourBookingStatus.COMPLETED, TourBookingStatus.CANCELLED],
      [TourBookingStatus.CANCELLED]: [], // Final state
      [TourBookingStatus.COMPLETED]: []  // Final state
    };

    if (!validTransitions[from].includes(to)) {
      throw new StatusTransitionError(from, to);
    }
  }

  /**
   * Update tour booking status
   */
  async updateTourBookingStatus(bookingId: string, newStatus: TourBookingStatus, adminId: string): Promise<TourBookingResponse> {
    if (!this.isPremiumTourismEnabled()) {
      throw new FeatureDisabledError();
    }

    const booking = await prisma.tourBooking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Tour booking not found');
    }

    // Validate transition
    this.validateStatusTransition(booking.status as TourBookingStatus, newStatus);

    const updatedBooking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: { 
        status: newStatus,
        ...(newStatus === TourBookingStatus.CONFIRMED && { confirmedBy: adminId, confirmedAt: new Date() })
      }
    });

    // Audit log
    console.log(`[TOUR_BOOKING_STATUS_UPDATED] AdminId: ${adminId}, BookingId: ${bookingId}, From: ${booking.status}, To: ${newStatus}`);

    return this.mapTourBookingResponse(updatedBooking);
  }

  /**
   * Map tour package to response format
   */
  private mapTourPackageResponse(pkg: any): TourPackageResponse {
    return {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      type: pkg.type,
      partnerName: pkg.partnerName,
      basePrice: parseFloat(pkg.basePrice.toString()),
      locations: Array.isArray(pkg.locations) ? pkg.locations : [],
      estimatedDurationMinutes: pkg.estimatedDurationMinutes,
      isActive: pkg.isActive,
      createdAt: pkg.createdAt
    };
  }

  /**
   * Map tour booking to response format
   */
  private mapTourBookingResponse(booking: any): TourBookingResponse {
    return {
      id: booking.id,
      packageId: booking.packageId,
      passengerId: booking.passengerId,
      scheduledAt: booking.scheduledAt,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      status: booking.status,
      createdAt: booking.createdAt
    };
  }
}
