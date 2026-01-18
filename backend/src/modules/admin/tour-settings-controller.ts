import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export class TourSettingsController {
  async get(req: Request, res: Response) {
    const settings = await prisma.tour_settings.findFirst();
    res.json({ success: true, data: settings });
  }
}
