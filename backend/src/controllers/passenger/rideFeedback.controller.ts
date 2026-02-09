import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

interface CreateFeedbackBody {
  rideId: string;
  rating: number;
  comment?: string;
  tags?: string[];
  isAnonymous?: boolean;
}

function hoursBetween(a: Date, b: Date): number {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60);
}

export async function createRideFeedback(req: Request, res: Response) {
  try {
    const passengerId = (req as any).passengerId;
    if (!passengerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { rideId, rating, comment, tags, isAnonymous }: CreateFeedbackBody = req.body;

    // Validação básica
    if (!rideId || rating === undefined) {
      return res.status(400).json({ success: false, error: 'rideId and rating are required' });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'rating must be an integer between 1 and 5' });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({ success: false, error: 'comment must be max 1000 characters' });
    }

    if (tags && (!Array.isArray(tags) || tags.length > 10)) {
      return res.status(400).json({ success: false, error: 'tags must be an array with max 10 items' });
    }

    // Buscar ride
    const ride = await prisma.rides.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        passenger_id: true,
        status: true,
        updated_at: true,
      },
    });

    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    // Verificar ownership
    if (ride.passenger_id !== passengerId) {
      return res.status(403).json({ success: false, error: 'Forbidden: ride does not belong to you' });
    }

    // Verificar se corrida foi completada
    if (ride.status !== 'completed') {
      return res.status(422).json({ success: false, error: 'Ride is not completed yet' });
    }

    // Verificar janela de 24h
    const windowHours = parseInt(process.env.FEEDBACK_WINDOW_HOURS || '24');
    const diffHours = hoursBetween(new Date(), new Date(ride.updated_at));

    if (diffHours > windowHours) {
      return res.status(422).json({
        success: false,
        error: `Feedback window expired (${windowHours}h)`,
      });
    }

    // Verificar duplicado
    const existing = await prisma.ride_feedbacks.findFirst({
      where: {
        ride_id: rideId,
        passenger_id: passengerId,
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Feedback already exists for this ride',
        feedbackId: existing.id,
      });
    }

    // Sanitizar comment
    const sanitizedComment = comment?.trim().slice(0, 1000) || null;

    // Criar feedback
    const feedback = await prisma.ride_feedbacks.create({
      data: {
        ride_id: rideId,
        passenger_id: passengerId,
        rating,
        comment: sanitizedComment,
        tags: tags ? JSON.stringify(tags) : null,
        is_anonymous: isAnonymous || false,
      },
      select: {
        id: true,
        created_at: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        feedbackId: feedback.id,
        createdAt: feedback.created_at,
      },
    });
  } catch (error: any) {
    console.error('[rideFeedback] Error creating feedback:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
