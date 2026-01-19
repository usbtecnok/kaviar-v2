import { prisma } from '../lib/prisma';
import { config } from '../config';
import { RatingData, RatingStats, RatingSummary, RaterType, UserType } from '../types/rating';
import { randomUUID } from 'crypto';

export class RatingService {

  /**
   * Create rating (simplified version)
   */
  async createRating(data: RatingData): Promise<{ success: boolean; rating?: any; error?: string; existingRating?: any }> {
    // Validate score
    if (data.score < 1 || data.score > 5) {
      return { success: false, error: 'Score must be between 1 and 5' };
    }

    // Validate comment length
    if (data.comment && data.comment.length > 200) {
      return { success: false, error: 'Comment exceeds 200 characters' };
    }

    try {
      // If rideId provided, validate ride exists and is completed
      if (data.rideId) {
        const ride = await prisma.rides.findUnique({
          where: { id: data.rideId }
        });

        if (!ride) {
          return { success: false, error: 'RIDE_NOT_FOUND' };
        }

        if (ride.status !== 'completed') {
          return { 
            success: false, 
            error: 'RIDE_NOT_COMPLETED'
          };
        }

        // Check for existing rating (idempotency)
        const existingRating = await prisma.ratings.findUnique({
          where: {
            ride_id_user_id: {
              ride_id: data.rideId,
              user_id: data.raterId
            }
          }
        });

        if (existingRating) {
          return { 
            success: false, 
            error: 'RATING_ALREADY_EXISTS',
            existingRating: {
              id: existingRating.id,
              rating: existingRating.rating,
              comment: existingRating.comment,
              created_at: existingRating.created_at
            }
          };
        }
      }

      // Create new rating
      const rating = await prisma.ratings.create({
        data: {
          id: randomUUID(),
          entity_type: 'DRIVER',
          entity_id: data.ratedId,
          user_id: data.raterId,
          ride_id: data.rideId || null,
          rated_id: data.ratedId,
          rater_id: data.raterId,
          rater_type: data.raterType,
          rating: data.score,
          score: data.score,
          comment: data.comment || null,
          created_at: new Date()
        }
      });

      // Update rating stats
      await this.updateRatingStats(data.ratedId, 'DRIVER');

      return { 
        success: true, 
        rating: {
          id: rating.id,
          rating: rating.rating,
          comment: rating.comment,
          created_at: rating.created_at
        }
      };

    } catch (error) {
      console.error('Error creating rating:', error);
      return { success: false, error: 'Failed to create rating' };
    }
  }

  /**
   * Get rating summary for a driver
   */
  async getRatingSummary(entityId: string, userType: UserType): Promise<RatingSummary> {
    try {
      const stats = await prisma.rating_stats.findUnique({
        where: {
          entity_type_entity_id: {
            entity_type: 'DRIVER',
            entity_id: entityId
          }
        }
      });

      if (!stats) {
        return {
          entityId,
          entityType: userType,
          stats: {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          },
          recentRatings: []
        };
      }

      // Get recent ratings
      const recentRatings = await prisma.ratings.findMany({
        where: {
          entity_type: 'DRIVER',
          entity_id: entityId
        },
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          rating: true,
          comment: true,
          created_at: true
        }
      });

      // Get rating distribution
      const distribution = await prisma.ratings.groupBy({
        by: ['rating'],
        where: {
          entity_type: 'DRIVER',
          entity_id: entityId
        },
        _count: {
          rating: true
        }
      });

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      distribution.forEach(item => {
        ratingDistribution[item.rating as keyof typeof ratingDistribution] = item._count.rating;
      });

      return {
        entityId,
        entityType: userType,
        stats: {
          averageRating: parseFloat(stats.average_rating.toString()),
          totalRatings: stats.total_ratings,
          ratingDistribution
        },
        recentRatings: recentRatings.map(r => ({
          rating: r.rating,
          comment: r.comment || undefined,
          createdAt: r.created_at
        }))
      };

    } catch (error) {
      console.error('Error getting rating summary:', error);
      return {
        entityId,
        entityType: userType,
        stats: {
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        },
        recentRatings: []
      };
    }
  }

  /**
   * Get pending rating ride for passenger
   * Returns the most recent completed ride without rating
   */
  async getPendingRatingRide(passengerId: string): Promise<any | null> {
    try {
      const ride = await prisma.rides.findFirst({
        where: {
          passenger_id: passengerId,
          status: 'completed'
        },
        orderBy: {
          updated_at: 'desc'
        }
      });

      if (!ride) {
        return null;
      }

      // Check if already rated
      const existingRating = await prisma.ratings.findFirst({
        where: {
          ride_id: ride.id,
          user_id: passengerId
        }
      });

      if (existingRating) {
        return null;
      }

      // Get driver info
      const driver = ride.driver_id ? await prisma.drivers.findUnique({
        where: { id: ride.driver_id },
        select: {
          id: true,
          name: true,
          phone: true
        }
      }) : null;

      return {
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        price: ride.price,
        status: ride.status,
        completedAt: ride.updated_at,
        driver: driver ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone
        } : null
      };

    } catch (error) {
      console.error('Error getting pending rating ride:', error);
      return null;
    }
  }

  /**
   * Update rating statistics
   */
  private async updateRatingStats(entityId: string, entityType: string): Promise<void> {
    try {
      // Calculate new stats
      const result = await prisma.ratings.aggregate({
        where: {
          entity_type: entityType,
          entity_id: entityId
        },
        _avg: { rating: true },
        _count: { rating: true },
        _sum: { rating: true }
      });

      const averageRating = result._avg.rating || 0;
      const totalRatings = result._count.rating || 0;
      const ratingSum = result._sum.rating || 0;

      // Upsert rating stats
      await prisma.rating_stats.upsert({
        where: {
          entity_type_entity_id: {
            entity_type: entityType,
            entity_id: entityId
          }
        },
        update: {
          average_rating: averageRating,
          total_ratings: totalRatings,
          rating_sum: ratingSum,
          updated_at: new Date(),
          last_updated: new Date()
        },
        create: {
          id: randomUUID(),
          entity_type: entityType,
          entity_id: entityId,
          average_rating: averageRating,
          total_ratings: totalRatings,
          rating_sum: ratingSum,
          updated_at: new Date(),
          last_updated: new Date()
        }
      });

    } catch (error) {
      console.error('Error updating rating stats:', error);
    }
  }
}
