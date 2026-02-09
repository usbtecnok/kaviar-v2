import { Router } from 'express';
import { authenticatePassenger } from '../middleware/auth';
import * as rideFeedbackController from '../controllers/passenger/rideFeedback.controller';

const router = Router();

// POST /api/passenger/ride-feedback
router.post('/ride-feedback', authenticatePassenger, rideFeedbackController.createRideFeedback);

export { router as passengerFeedbackRoutes };
