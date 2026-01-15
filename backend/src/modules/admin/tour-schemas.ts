import { z } from 'zod';
import { TourPackageType, TourBookingStatus } from '@prisma/client';

export const createTourPackageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  type: z.nativeEnum(TourPackageType, { 
    errorMap: () => ({ message: 'Invalid TourPackage.type. Must be TOUR or AIRPORT_TRANSFER' })
  }),
  partnerName: z.string().min(1, 'Partner name is required').max(100),
  basePrice: z.number().positive('Base price must be positive'),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  estimatedDurationMinutes: z.number().int().positive('Duration must be positive')
});

export const updateTourPackageSchema = createTourPackageSchema.partial();

export const tourPackageParamsSchema = z.object({
  id: z.string().uuid()
});

export const confirmTourBookingSchema = z.object({
  adminId: z.string().uuid()
});

export const updateTourBookingStatusSchema = z.object({
  status: z.nativeEnum(TourBookingStatus, {
    errorMap: () => ({ message: 'Invalid TourBooking.status. Must be REQUESTED, CONFIRMED, CANCELLED, or COMPLETED' })
  })
});

export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20)
});

export type CreateTourPackageData = z.infer<typeof createTourPackageSchema>;
export type UpdateTourPackageData = z.infer<typeof updateTourPackageSchema>;
