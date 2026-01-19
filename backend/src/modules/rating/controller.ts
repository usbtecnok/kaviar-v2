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

        if (result.error === 'RIDE_NOT_FOUND') {
          return res.status(404).json({
            success: false,
            error: result.error,
            message: 'Corrida não encontrada'
          });
        }

        if (result.error === 'RIDE_NOT_COMPLETED') {
          return res.status(400).json({
            success: false,
            error: result.error,
            message: 'Corrida ainda não foi finalizada'
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

  // GET /api/governance/ratings/driver/:driverId
  getRatingSummary = async (req: Request, res: Response) => {
    try {
      const { driverId } = req.params;
      
      const userType = UserType.DRIVER;
      const summary = await this.ratingService.getRatingSummary(driverId, userType);

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

  // GET /api/ratings/pending/:passengerId
  getPendingRating = async (req: Request, res: Response) => {
    try {
      const { passengerId } = req.params;
      
      const pendingRide = await this.ratingService.getPendingRatingRide(passengerId);

      if (!pendingRide) {
        return res.status(404).json({
          success: false,
          error: 'NO_PENDING_RATING',
          message: 'Nenhuma corrida pendente de avaliação'
        });
      }

      res.json({
        success: true,
        ride: pendingRide
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending rating'
      });
    }
  };
}
