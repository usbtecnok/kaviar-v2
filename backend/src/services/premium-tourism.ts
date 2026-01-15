import { prisma } from '../config/database';
import { config } from '../config';
import { FeatureDisabledError } from '../errors/FeatureDisabledError';
import { CreateTourBookingData } from '../modules/governance/tour-schemas';
import { randomUUID } from 'crypto';
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

    const tourPackage = await prisma.tour_packages.create({
      data: {
        id: randomUUID(),
        title: data.title,
        description: data.description,
        type: data.type,
        partner_name: data.partnerName,
        base_price: data.basePrice,
        locations: data.locations,
        estimated_duration_minutes: data.estimatedDurationMinutes,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date()
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
      prisma.tour_packages.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { tour_bookings: true }
          }
        }
      }),
      prisma.tour_packages.count()
    ]);

    return {
      packages: packages.map((pkg: any) => ({
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

    const packages = await prisma.tour_packages.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' }
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

    const prismaData: any = {
      updated_at: new Date()
    };

    if (data.title !== undefined) prismaData.title = data.title;
    if (data.description !== undefined) prismaData.description = data.description;
    if (data.type !== undefined) prismaData.type = data.type;
    if (data.partnerName !== undefined) prismaData.partner_name = data.partnerName;
    if (data.basePrice !== undefined) prismaData.base_price = data.basePrice;
    if (data.locations !== undefined) prismaData.locations = data.locations;
    if (data.estimatedDurationMinutes !== undefined) prismaData.estimated_duration_minutes = data.estimatedDurationMinutes;

    const tourPackage = await prisma.tour_packages.update({
      where: { id },
      data: prismaData
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

    await prisma.tour_packages.update({
      where: { id },
      data: { is_active: false }
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
    const tourPackage = await prisma.tour_packages.findFirst({
      where: { id: data.tourPackageId, is_active: true }
    });

    if (!tourPackage) {
      throw new Error('Tour package not found or inactive');
    }

    // Calculate total price
    const totalPrice = Number(tourPackage.base_price) * data.passengerCount;

    // Check premium drivers availability
    const availability = await this.checkPremiumDriverAvailability();

    const booking = await prisma.tour_bookings.create({
      data: {
        id: randomUUID(),
        package_id: data.tourPackageId,
        passenger_name: data.passengerName,
        passenger_email: data.passengerEmail,
        passenger_phone: data.passengerPhone,
        passenger_count: data.passengerCount,
        scheduled_date: data.scheduledDate,
        special_requests: data.specialRequests,
        emergency_contact: data.emergencyContact,
        emergency_phone: data.emergencyPhone,
        total_price: totalPrice,
        status: TourBookingStatus.REQUESTED,
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        tour_packages: true
      }
    });

    // Audit log
    console.log(`[TOUR_BOOKING_CREATED] BookingId: ${booking.id}, PackageId: ${data.tourPackageId}, Passenger: ${data.passengerName}`);

    return {
      booking: {
        id: booking.id,
        packageTitle: booking.tour_packages.title,
        passengerName: booking.passenger_name || 'N/A',
        scheduledDate: booking.scheduled_date,
        status: booking.status,
        totalPrice: booking.total_price,
        created_at: booking.created_at
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
    const booking = await prisma.tour_bookings.update({
      where: { id: bookingId },
      data: {
        status: TourBookingStatus.CONFIRMED,
        confirmed_by: adminId,
        confirmed_at: new Date()
      },
      include: { tour_packages: true }
    });

    return {
      booking: {
        id: booking.id,
        status: booking.status,
        confirmedAt: booking.confirmed_at
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
      prisma.tour_bookings.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          tour_packages: { select: { title: true } },
          passengers: { select: { name: true } }
        }
      }),
      prisma.tour_bookings.count()
    ]);

    return {
      bookings: bookings.map((booking: any) => ({
        id: booking.id,
        packageTitle: booking.tour_packages.title,
        passengerName: booking.passenger_name || booking.passenger?.name || 'N/A',
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        pickupLocation: booking.pickupLocation,
        created_at: booking.created_at
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
    const availableCount = await prisma.drivers.count({
      where: {
        OR: [
          { is_premium: true },
          { premium_override: true }
        ],
        status: 'approved',
        suspended_at: null,
        last_location_updated_at: {
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

    const totalPremium = await prisma.drivers.count({
      where: {
        OR: [
          { is_premium: true },
          { premium_override: true }
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

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { premium_override: true }
    });

    if (!driver) return false;

    // Override always wins
    if (driver.premium_override) {
      await prisma.drivers.update({
        where: { id: driverId },
        data: { is_premium: true }
      });
      return true;
    }

    // Check rating criteria
    const stats = await prisma.rating_stats.findUnique({
      where: { user_id: driverId }
    });

    const meetsRatingCriteria = stats && 
      parseFloat(stats.average_rating.toString()) >= config.premiumTourism.minRatingPremium &&
      stats.total_ratings >= config.premiumTourism.minRatingsCountPremium;

    await prisma.drivers.update({
      where: { id: driverId },
      data: { is_premium: meetsRatingCriteria || false }
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

    const booking = await prisma.tour_bookings.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      throw new Error('Tour booking not found');
    }

    // Validate transition
    this.validateStatusTransition(booking.status as TourBookingStatus, newStatus);

    const updatedBooking = await prisma.tour_bookings.update({
      where: { id: bookingId },
      data: { 
        status: newStatus,
        ...(newStatus === TourBookingStatus.CONFIRMED && { confirmed_by: adminId, confirmedAt: new Date() })
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
      partnerName: pkg.partner_name,
      basePrice: parseFloat(pkg.base_price.toString()),
      locations: Array.isArray(pkg.locations) ? pkg.locations : [],
      estimatedDurationMinutes: pkg.estimatedDurationMinutes,
      isActive: pkg.is_active,
      created_at: pkg.created_at
    };
  }

  /**
   * Map tour booking to response format
   */
  private mapTourBookingResponse(booking: any): TourBookingResponse {
    return {
      id: booking.id,
      packageId: booking.package_id,
      passengerId: booking.passengerId,
      scheduledAt: booking.scheduledAt,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      status: booking.status,
      created_at: booking.created_at
    };
  }
}
