import { Request, Response } from 'express';
import { PremiumTourismService } from '../../services/premium-tourism';
import { createTourBookingSchema, CreateTourBookingData } from './tour-schemas';

export class TourController {
  private premiumTourismService = new PremiumTourismService();

  // GET /api/governance/tour-packages
  getActiveTourPackages = async (req: Request, res: Response) => {
    try {
      const packages = await this.premiumTourismService.getActiveTourPackages();

      res.json({
        success: true,
        packages
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // POST /api/governance/tour-bookings
  createTourBooking = async (req: Request, res: Response) => {
    try {
      const data = createTourBookingSchema.parse(req.body);
      
      const result = await this.premiumTourismService.createTourBooking(data);

      res.status(201).json({
        success: true,
        booking: result.booking,
        premiumDriversAvailable: result.premiumDriversAvailable,
        message: result.premiumDriversAvailable > 0 
          ? 'Booking created successfully' 
          : 'Booking created but no premium drivers currently available'
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
}
