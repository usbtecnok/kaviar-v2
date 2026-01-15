import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { 
  createTourPartnerSchema, 
  updateTourPartnerSchema, 
  tourPartnerParamsSchema,
  paginationSchema 
} from './tour-schemas';

const prisma = new PrismaClient();

export class TourPartnerController {
  // POST /api/admin/tour-partners
  createTourPartner = async (req: Request, res: Response) => {
    try {
      const data = createTourPartnerSchema.parse(req.body);
      
      const partner = await prisma.tour_partners.create({
        data: {
          id: crypto.randomUUID(),
          updated_at: new Date(),
          name: data.name,
          contact_name: data.contactName || null,
          phone: data.phone || null,
          email: data.email || null,
          is_active: true
        }
      });

      res.json({
        success: true,
        partner
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // GET /api/admin/tour-partners
  getAllTourPartners = async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const skip = (page - 1) * limit;

      const [partners, total] = await Promise.all([
        prisma.tour_partners.findMany({
          take: limit,
          skip,
          orderBy: { created_at: 'desc' }
        }),
        prisma.tour_partners.count()
      ]);

      res.json({
        success: true,
        partners,
        pagination: { total, page, limit }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // GET /api/admin/tour-partners/:id
  getTourPartner = async (req: Request, res: Response) => {
    try {
      const { id } = tourPartnerParamsSchema.parse(req.params);
      
      const partner = await prisma.tour_partners.findUnique({
        where: { id }
      });

      if (!partner) {
        return res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
      }

      res.json({
        success: true,
        partner
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // PUT /api/admin/tour-partners/:id
  updateTourPartner = async (req: Request, res: Response) => {
    try {
      const { id } = tourPartnerParamsSchema.parse(req.params);
      const data = updateTourPartnerSchema.parse(req.body);
      
      const partner = await prisma.tour_partners.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.contactName !== undefined && { contact_name: data.contactName }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email })
        }
      });

      res.json({
        success: true,
        partner
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // PATCH /api/admin/tour-partners/:id/deactivate
  deactivateTourPartner = async (req: Request, res: Response) => {
    try {
      const { id } = tourPartnerParamsSchema.parse(req.params);
      
      const partner = await prisma.tour_partners.update({
        where: { id },
        data: {
          is_active: false
        }
      });

      res.json({
        success: true,
        partner
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };
}
