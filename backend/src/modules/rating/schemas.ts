import { z } from 'zod';

export const createRatingSchema = z.object({
  rideId: z.string().cuid(),
  raterId: z.string().cuid(),
  ratedId: z.string().cuid(),
  raterType: z.enum(['DRIVER', 'PASSENGER']),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional()
});

export const ratingSummaryParamsSchema = z.object({
  type: z.enum(['driver', 'passenger']),
  id: z.string().cuid()
});

export type CreateRatingData = z.infer<typeof createRatingSchema>;
export type RatingSummaryParams = z.infer<typeof ratingSummaryParamsSchema>;
