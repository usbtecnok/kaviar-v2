import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/admin/ride-feedbacks
 * List all ride feedbacks with pagination
 */
export const listRideFeedbacks = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [feedbacks, total] = await Promise.all([
      prisma.ride_feedbacks.findMany({
        take: limit,
        skip,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          ride_id: true,
          passenger_id: true,
          rating: true,
          comment: true,
          tags: true,
          is_anonymous: true,
          created_at: true,
          updated_at: true,
          passengers: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ride_feedback_sentiment_analysis: {
            select: {
              sentiment_label: true,
              sentiment_score: true,
              confidence_score: true,
              analyzed_at: true,
            },
          },
        },
      }),
      prisma.ride_feedbacks.count(),
    ]);

    // Transform data to match API contract
    const data = feedbacks.map((feedback) => ({
      id: feedback.id,
      rideId: feedback.ride_id,
      rating: feedback.rating,
      comment: feedback.comment,
      tags: feedback.tags ? JSON.parse(feedback.tags) : null,
      isAnonymous: feedback.is_anonymous,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      passenger: feedback.is_anonymous
        ? { id: feedback.passenger_id, name: 'Anônimo', email: null }
        : {
            id: feedback.passengers.id,
            name: feedback.passengers.name,
            email: feedback.passengers.email,
          },
      sentiment: feedback.ride_feedback_sentiment_analysis
        ? {
            label: feedback.ride_feedback_sentiment_analysis.sentiment_label,
            score: feedback.ride_feedback_sentiment_analysis.sentiment_score,
            confidence: feedback.ride_feedback_sentiment_analysis.confidence_score,
            analyzedAt: feedback.ride_feedback_sentiment_analysis.analyzed_at,
          }
        : null,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[rideFeedback.controller] Error listing feedbacks:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar feedbacks',
    });
  }
};

/**
 * GET /api/admin/ride-feedbacks/:rideId
 * Get feedback for a specific ride
 */
export const getRideFeedback = async (req: Request, res: Response) => {
  try {
    const { rideId } = req.params;

    const feedback = await prisma.ride_feedbacks.findUnique({
      where: { ride_id: rideId },
      select: {
        id: true,
        ride_id: true,
        passenger_id: true,
        rating: true,
        comment: true,
        tags: true,
        is_anonymous: true,
        created_at: true,
        updated_at: true,
        passengers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ride_feedback_sentiment_analysis: {
          select: {
            sentiment_label: true,
            sentiment_score: true,
            confidence_score: true,
            model_version: true,
            analyzed_at: true,
            analysis_metadata: true,
          },
        },
      },
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback não encontrado para esta corrida',
      });
    }

    // Transform data to match API contract
    const data = {
      id: feedback.id,
      rideId: feedback.ride_id,
      rating: feedback.rating,
      comment: feedback.comment,
      tags: feedback.tags ? JSON.parse(feedback.tags) : null,
      isAnonymous: feedback.is_anonymous,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      passenger: feedback.is_anonymous
        ? { id: feedback.passenger_id, name: 'Anônimo', email: null }
        : {
            id: feedback.passengers.id,
            name: feedback.passengers.name,
            email: feedback.passengers.email,
          },
      sentiment: feedback.ride_feedback_sentiment_analysis
        ? {
            label: feedback.ride_feedback_sentiment_analysis.sentiment_label,
            score: feedback.ride_feedback_sentiment_analysis.sentiment_score,
            confidence: feedback.ride_feedback_sentiment_analysis.confidence_score,
            modelVersion: feedback.ride_feedback_sentiment_analysis.model_version,
            analyzedAt: feedback.ride_feedback_sentiment_analysis.analyzed_at,
            metadata: feedback.ride_feedback_sentiment_analysis.analysis_metadata
              ? JSON.parse(feedback.ride_feedback_sentiment_analysis.analysis_metadata)
              : null,
          }
        : null,
    };

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[rideFeedback.controller] Error getting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar feedback',
    });
  }
};
