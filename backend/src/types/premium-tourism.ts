// Import enums from Prisma client
import { TourPackageType, TourBookingStatus } from '@prisma/client';

export { TourPackageType, TourBookingStatus };

export interface TourPackageData {
  title: string;
  description: string;
  type: TourPackageType;
  partnerName: string;
  basePrice: number;
  locations: string[];
  estimatedDurationMinutes: number;
}

export interface TourBookingData {
  packageId: string;
  passengerId: string;
  scheduledAt: Date;
  pickupLocation: string;
  dropoffLocation?: string;
}

export interface TourPackageResponse {
  id: string;
  title: string;
  description: string;
  type: TourPackageType;
  partnerName: string;
  basePrice: number;
  locations: string[];
  estimatedDurationMinutes: number;
  isActive: boolean;
  created_at: Date;
}

export interface TourBookingResponse {
  id: string;
  packageId: string;
  passengerId: string;
  scheduledAt: Date;
  pickupLocation: string;
  dropoffLocation?: string;
  status: TourBookingStatus;
  created_at: Date;
}

export interface PremiumDriverAvailability {
  available: number;
  total: number;
  hasAvailable: boolean;
}
