import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export class TourReportController {
  async list(req: Request, res: Response) {
    // TODO: Implement reports aggregation from tour_bookings
    res.json({ success: true, data: [] });
  }
}
