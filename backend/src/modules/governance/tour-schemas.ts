import { z } from 'zod';

export const createTourBookingSchema = z.object({
  packageId: z.string().cuid(),
  passengerId: z.string().cuid(),
  scheduledAt: z.string().datetime().transform(val => new Date(val)),
  pickupLocation: z.string().min(1, 'Pickup location is required').max(200),
  dropoffLocation: z.string().max(200).optional()
});

export type CreateTourBookingData = z.infer<typeof createTourBookingSchema>;
