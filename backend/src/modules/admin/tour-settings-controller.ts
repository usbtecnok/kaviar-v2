import { prisma } from '../../lib/prisma';

export class TourSettingsController {
  async get(req, res) {
    const settings = await prisma.tourSettings.findFirst();
    res.json({ success: true, data: settings });
  }
}
