import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export class TourPartnerController {
  async list(req: Request, res: Response) {
    const partners = await prisma.tour_partners.findMany();
    res.json({ success: true, data: partners });
  }
}
