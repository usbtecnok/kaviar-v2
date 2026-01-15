import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { updateTourSettingsSchema } from './tour-schemas';

const prisma = new PrismaClient();

export class TourSettingsController {
  // GET /api/admin/tour-settings
  getTourSettings = async (req: Request, res: Response) => {
    try {
      let settings = await prisma.tour_settings.findFirst();
      
      // Create default if not exists
      if (!settings) {
        settings = await prisma.tour_settings.create({
          data: {
            id: crypto.randomUUID(),
            updated_at: new Date(),
            support_whatsapp: null,
            default_partner_id: null,
            terms_url: null,
            is_active: true
          }
        });
      }

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // PUT /api/admin/tour-settings
  updateTourSettings = async (req: Request, res: Response) => {
    try {
      const data = updateTourSettingsSchema.parse(req.body);
      
      let settings = await prisma.tour_settings.findFirst();
      
      if (!settings) {
        // Create if not exists
        settings = await prisma.tour_settings.create({
          data: {
            id: crypto.randomUUID(),
            updated_at: new Date(),
            support_whatsapp: data.supportWhatsapp || null,
            default_partner_id: data.defaultPartnerId || null,
            terms_url: data.termsUrl || null,
            is_active: data.isActive !== undefined ? data.isActive : true
          }
        });
      } else {
        // Update existing
        settings = await prisma.tour_settings.update({
          where: { id: settings.id },
          data: {
            ...(data.supportWhatsapp !== undefined && { support_whatsapp: data.supportWhatsapp }),
            ...(data.defaultPartnerId !== undefined && { default_partner_id: data.defaultPartnerId }),
            ...(data.termsUrl !== undefined && { terms_url: data.termsUrl }),
            ...(data.isActive !== undefined && { is_active: data.isActive })
          }
        });
      }

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };
}
