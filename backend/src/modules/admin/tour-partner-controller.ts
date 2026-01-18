import { prisma } from '../../lib/prisma';

export class TourPartnerController {
  async list(req, res) {
    const partners = await prisma.tourPartner.findMany();
    res.json({ success: true, data: partners });
  }
}
