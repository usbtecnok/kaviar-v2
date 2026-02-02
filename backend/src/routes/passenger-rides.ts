import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middleware/auth';

const router = Router();

// POST /api/rides/:id/cancel
router.post('/:id/cancel', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const ride = await tx.rides.findUnique({
        where: { id },
        select: { status: true, passenger_id: true, updated_at: true }
      });

      if (!ride) {
        throw new Error('Corrida não encontrada');
      }

      if (ride.passenger_id !== passengerId) {
        throw new Error('Não autorizado');
      }

      if (['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)) {
        throw new Error('Corrida já foi finalizada ou cancelada');
      }

      const updated = await tx.rides.updateMany({
        where: { 
          id,
          status: ride.status,
          updated_at: ride.updated_at
        },
        data: {
          status: 'cancelled_by_user',
          cancel_reason: reason || 'Cancelado pelo passageiro',
          cancelled_by: passengerId,
          cancelled_at: new Date()
        }
      });

      if (updated.count === 0) {
        throw new Error('Corrida foi modificada, tente novamente');
      }

      await tx.ride_status_history.create({
        data: {
          id: `${id}-status-${Date.now()}`,
          ride_id: id,
          status: 'cancelled_by_user'
        }
      });

      return tx.rides.findUnique({ where: { id } });
    });

    res.json({ success: true, ride: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
