import { prisma } from '../../lib/prisma';

export class TourReportController {
  async list(req, res) {
    const reports = await prisma.tourReport.findMany();
    res.json({ success: true, data: reports });
  }
}
