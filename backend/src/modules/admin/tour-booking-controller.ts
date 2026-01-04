import { Request, Response } from 'express';
import { PremiumTourismService, StatusTransitionError } from '../../services/premium-tourism';
import { confirmTourBookingSchema, paginationSchema, tourPackageParamsSchema, updateTourBookingStatusSchema } from './tour-schemas';

export class TourBookingController {
  private premiumTourismService = new PremiumTourismService();

  // GET /api/admin/tour-bookings
  getAllTourBookings = async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      
      const result = await this.premiumTourismService.getAllTourBookings(page, limit);

      res.json({
        success: true,
        bookings: result.bookings,
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

  // POST /api/admin/tour-bookings/:id/confirm
  confirmTourBooking = async (req: Request, res: Response) => {
    try {
      const { id } = tourPackageParamsSchema.parse(req.params);
      const { adminId } = confirmTourBookingSchema.parse(req.body);
      
      const result = await this.premiumTourismService.confirmTourBooking(id, adminId);

      res.json({
        success: true,
        booking: result.booking,
        // rideId: result.rideId, // TODO: Implementar após ajustar schema
        message: 'Tour booking confirmed'
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('No premium drivers')) {
        return res.status(400).json({
          success: false,
          error: 'NO_PREMIUM_DRIVERS_AVAILABLE',
          message: 'No premium drivers available for this booking'
        });
      }

      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request'
      });
    }
  };

  // PATCH /api/admin/tour-bookings/:id/status
  updateTourBookingStatus = async (req: Request, res: Response) => {
    try {
      const { id } = tourPackageParamsSchema.parse(req.params);
      const { status } = updateTourBookingStatusSchema.parse(req.body);
      const adminId = req.user?.id || 'admin'; // Get from auth middleware
      
      const booking = await this.premiumTourismService.updateTourBookingStatus(id, status, adminId);

      res.json({
        success: true,
        booking,
        message: `Tour booking status updated to ${status}`
      });

    } catch (error) {
      if (error instanceof StatusTransitionError) {
        return res.status(409).json({
          success: false,
          error: 'INVALID_STATUS_TRANSITION',
          from: error.message.split(' ')[4], // Extract from error message
          to: error.message.split(' ')[6],
          message: error.message
        });
      }

      console.error('Error updating tour booking status:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update tour booking status'
      });
    }
  };
}
