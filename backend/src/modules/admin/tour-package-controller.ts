import { Request, Response } from 'express';
import { PremiumTourismService } from '../../services/premium-tourism';
import { TourPackageType } from '../../types/premium-tourism';
import { 
  createTourPackageSchema, 
  updateTourPackageSchema, 
  tourPackageParamsSchema,
  paginationSchema 
} from './tour-schemas';

export class TourPackageController {
  private premiumTourismService = new PremiumTourismService();

  // POST /api/admin/tour-packages
  createTourPackage = async (req: Request, res: Response) => {
    try {
      const data = createTourPackageSchema.parse(req.body);
      const adminId = (req as any).admin?.id || 'admin'; // TODO: Get from auth middleware
      
      const tourPackage = await this.premiumTourismService.createTourPackage({
        ...data,
        type: data.type as TourPackageType
      }, adminId);

      res.status(201).json({
        success: true,
        package: tourPackage
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Premium tourism disabled') {
        return res.status(404).json({
          success: false,
          error: 'Premium tourism disabled'
        });
      }

      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request data'
      });
    }
  };

  // GET /api/admin/tour-packages
  getAllTourPackages = async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      
      const result = await this.premiumTourismService.getAllTourPackages(page, limit);

      res.json({
        success: true,
        packages: result.packages,
        pagination: {
          total: result.total,
          page,
          limit
        }
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Premium tourism disabled') {
        return res.status(404).json({
          success: false,
          error: 'Premium tourism disabled'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // GET /api/admin/tour-packages/:id
  getTourPackage = async (req: Request, res: Response) => {
    try {
      const { id } = tourPackageParamsSchema.parse(req.params);
      
      // For MVP, just return from list (could optimize later)
      const result = await this.premiumTourismService.getAllTourPackages(1, 1000);
      const tourPackage = result.packages.find(pkg => pkg.id === id);

      if (!tourPackage) {
        return res.status(404).json({
          success: false,
          error: 'Tour package not found'
        });
      }

      res.json({
        success: true,
        package: tourPackage
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // PUT /api/admin/tour-packages/:id
  updateTourPackage = async (req: Request, res: Response) => {
    try {
      const { id } = tourPackageParamsSchema.parse(req.params);
      const data = updateTourPackageSchema.parse(req.body);
      const adminId = (req as any).admin?.id || 'admin'; // TODO: Get from auth middleware
      
      const tourPackage = await this.premiumTourismService.updateTourPackage(id, {
        ...data,
        type: data.type ? data.type as TourPackageType : undefined
      }, adminId);

      res.json({
        success: true,
        package: tourPackage
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // PATCH /api/admin/tour-packages/:id/deactivate
  deactivateTourPackage = async (req: Request, res: Response) => {
    try {
      const { id } = tourPackageParamsSchema.parse(req.params);
      const adminId = (req as any).admin?.id || 'admin'; // TODO: Get from auth middleware
      
      await this.premiumTourismService.deactivateTourPackage(id, adminId);

      res.json({
        success: true,
        message: 'Tour package deactivated'
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };
}
