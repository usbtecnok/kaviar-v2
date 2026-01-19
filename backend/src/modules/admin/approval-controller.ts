import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import twilio from 'twilio';

const approveDriverSchema = z.object({
  id: z.string()
});

const approveGuideSchema = z.object({
  id: z.string()
});

export class ApprovalController {
  
  // PUT /api/admin/drivers/:id/approve
  approveDriver = async (req: Request, res: Response) => {
    try {
      const { id } = approveDriverSchema.parse(req.params);
      
      // Find driver
      const driver = await prisma.drivers.findUnique({ where: { id } });
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Motorista não encontrado'
        });
      }

      // Update status to approved
      const updatedDriver = await prisma.drivers.update({
        where: { id },
        data: {
          status: 'approved',
          updated_at: new Date()
        }
      });

      // Send WhatsApp notification if phone exists and Twilio is configured
      if (updatedDriver.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14134759634',
            to: `whatsapp:${updatedDriver.phone}`,
            body: `Olá ${updatedDriver.name}! Sua conta foi aprovada no Kaviar. Você já pode começar a aceitar corridas.`
          });
          console.log(`✅ WhatsApp sent to ${updatedDriver.phone}`);
        } catch (whatsappError) {
          console.error('⚠️  WhatsApp notification failed:', whatsappError);
          // Don't fail the approval if WhatsApp fails
        }
      }

      res.json({
        success: true,
        data: {
          id: updatedDriver.id,
          name: updatedDriver.name,
          email: updatedDriver.email,
          status: updatedDriver.status
        },
        message: 'Motorista aprovado com sucesso'
      });
    } catch (error) {
      console.error('Error approving driver:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar motorista'
      });
    }
  };

  // PUT /api/admin/drivers/:id/reject
  rejectDriver = async (req: Request, res: Response) => {
    try {
      const { id } = approveDriverSchema.parse(req.params);
      
      // Find driver
      const driver = await prisma.drivers.findUnique({ where: { id } });
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Motorista não encontrado'
        });
      }

      // Update status to rejected
      const updatedDriver = await prisma.drivers.update({
        where: { id },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedDriver.id,
          name: updatedDriver.name,
          email: updatedDriver.email,
          status: updatedDriver.status
        },
        message: 'Motorista rejeitado'
      });
    } catch (error) {
      console.error('Error rejecting driver:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao rejeitar motorista'
      });
    }
  };

  // PUT /api/admin/guides/:id/approve
  approveGuide = async (req: Request, res: Response) => {
    try {
      const { id } = approveGuideSchema.parse(req.params);
      
      // Find guide
      const guide = await prisma.tourist_guides.findUnique({ where: { id } });
      if (!guide) {
        return res.status(404).json({
          success: false,
          error: 'Guia turístico não encontrado'
        });
      }

      // Update status to approved
      const updatedGuide = await prisma.tourist_guides.update({
        where: { id },
        data: {
          status: 'approved',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedGuide.id,
          name: updatedGuide.name,
          email: updatedGuide.email,
          status: updatedGuide.status
        },
        message: 'Guia turístico aprovado com sucesso'
      });
    } catch (error) {
      console.error('Error approving guide:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar guia turístico'
      });
    }
  };

  // PUT /api/admin/guides/:id/reject
  rejectGuide = async (req: Request, res: Response) => {
    try {
      const { id } = approveGuideSchema.parse(req.params);
      
      // Find guide
      const guide = await prisma.tourist_guides.findUnique({ where: { id } });
      if (!guide) {
        return res.status(404).json({
          success: false,
          error: 'Guia turístico não encontrado'
        });
      }

      // Update status to rejected
      const updatedGuide = await prisma.tourist_guides.update({
        where: { id },
        data: {
          status: 'rejected',
          updated_at: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          id: updatedGuide.id,
          name: updatedGuide.name,
          email: updatedGuide.email,
          status: updatedGuide.status
        },
        message: 'Guia turístico rejeitado'
      });
    } catch (error) {
      console.error('Error rejecting guide:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao rejeitar guia turístico'
      });
    }
  };

  // GET /api/admin/drivers - FONTE ÚNICA (Aprovação + Gerenciamento)
  getDrivers = async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const drivers = await prisma.drivers.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          document_cpf: true,
          document_rg: true,
          document_cnh: true,
          vehicle_plate: true,
          vehicle_model: true,
          neighborhood_id: true,
          community_id: true,
          created_at: true,
          updated_at: true,
          approved_at: true,
          rejected_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      // Normalize para frontend (camelCase + ISO dates)
      const normalized = drivers.map(d => ({
        id: d.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        status: d.status,
        documentCpf: d.document_cpf,
        documentRg: d.document_rg,
        documentCnh: d.document_cnh,
        vehiclePlate: d.vehicle_plate,
        vehicleModel: d.vehicle_model,
        neighborhoodId: d.neighborhood_id,
        communityId: d.community_id,
        createdAt: d.created_at?.toISOString(),
        updatedAt: d.updated_at?.toISOString(),
        approvedAt: d.approved_at?.toISOString() || null,
        rejectedAt: d.rejected_at?.toISOString() || null
      }));

      res.json({
        success: true,
        data: normalized
      });
    } catch (error) {
      console.error('Error getting drivers:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar motoristas'
      });
    }
  };

  // GET /api/admin/drivers/metrics/by-neighborhood
  getDriversByNeighborhood = async (req: Request, res: Response) => {
    try {
      const drivers = await prisma.drivers.groupBy({
        by: ['neighborhood_id', 'status'],
        _count: true,
        where: {
          neighborhood_id: { not: null }
        }
      });

      // Buscar nomes dos bairros
      const neighborhoodIds = [...new Set(drivers.map(d => d.neighborhood_id).filter(Boolean))];
      const neighborhoods = await prisma.neighborhoods.findMany({
        where: { id: { in: neighborhoodIds as string[] } },
        select: { id: true, name: true }
      });

      const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n.name]));

      // Agrupar por bairro
      const metrics = new Map<string, { neighborhoodId: string; name: string; total: number; approved: number; pending: number }>();

      drivers.forEach(d => {
        if (!d.neighborhood_id) return;
        
        if (!metrics.has(d.neighborhood_id)) {
          metrics.set(d.neighborhood_id, {
            neighborhoodId: d.neighborhood_id,
            name: neighborhoodMap.get(d.neighborhood_id) || 'Desconhecido',
            total: 0,
            approved: 0,
            pending: 0
          });
        }

        const metric = metrics.get(d.neighborhood_id)!;
        metric.total += d._count;
        
        if (d.status === 'approved') {
          metric.approved += d._count;
        } else if (d.status === 'pending') {
          metric.pending += d._count;
        }
      });

      res.json({
        success: true,
        data: Array.from(metrics.values()).sort((a, b) => b.total - a.total)
      });
    } catch (error) {
      console.error('Error getting drivers by neighborhood:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar métricas'
      });
    }
  };

  // GET /api/admin/guides - List guides for approval
  getGuides = async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const guides = await prisma.tourist_guides.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          is_bilingual: true,
          languages: true,
          also_driver: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({
        success: true,
        data: guides
      });
    } catch (error) {
      console.error('Error getting guides:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar guias turísticos'
      });
    }
  };
}
