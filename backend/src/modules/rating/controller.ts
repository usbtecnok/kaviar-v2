import { Request, Response } from 'express';
import { RatingService } from '../../services/rating';
import { UserType, RaterType } from '../../types/rating';
import { createRatingSchema, ratingSummaryParamsSchema } from './schemas';

export class RatingController {
  private ratingService = new RatingService();

  // POST /api/governance/ratings
  createRating = async (req: Request, res: Response) => {
    try {
      const data = createRatingSchema.parse(req.body);
      
      const result = await this.ratingService.createRating({
        ...data,
        raterType: data.raterType as RaterType
      });

      if (!result.success) {
        if (result.error === 'RATING_ALREADY_EXISTS') {
          return res.status(409).json({
            success: false,
            error: result.error,
            existingRating: result.existingRating
          });
        }

        if (result.error === 'RATING_WINDOW_EXPIRED') {
          return res.status(400).json({
            success: false,
            error: result.error,
            message: 'Rating window has expired'
          });
        }

        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      // Get updated stats for response
      const userType = data.raterType === 'DRIVER' ? UserType.PASSENGER : UserType.DRIVER;
      const summary = await this.ratingService.getRatingSummary(data.ratedId, userType);

      res.status(201).json({
        success: true,
        rating: result.rating,
        updatedStats: summary.stats
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  };

  // GET /api/governance/ratings/summary/:type/:id
  getRatingSummary = async (req: Request, res: Response) => {
    try {
      const { type, id } = ratingSummaryParamsSchema.parse(req.params);
      
      const userType = type === 'driver' ? UserType.DRIVER : UserType.PASSENGER;
      const summary = await this.ratingService.getRatingSummary(id, userType);

      res.json({
        success: true,
        summary
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request parameters'
      });
    }
  };
}
