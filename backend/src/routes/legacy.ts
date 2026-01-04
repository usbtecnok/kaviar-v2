import { Router } from 'express';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// Apply authentication to all legacy routes for security
router.use(authenticateAdmin);

// Legacy API placeholder routes
// Note: These are placeholders - actual legacy logic should be imported from root /api folder

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'legacy',
    message: 'Legacy APIs - Admin access required',
    timestamp: new Date().toISOString()
  });
});

// Placeholder for legacy bonus metrics
router.get('/bonus-metrics', (req, res) => {
  res.json({
    success: true,
    message: 'Legacy bonus metrics endpoint',
    data: [],
    note: 'This is a placeholder - implement actual legacy logic if needed'
  });
});

// Placeholder for legacy reports
router.get('/reports', (req, res) => {
  res.json({
    success: true,
    message: 'Legacy reports endpoint',
    data: [],
    note: 'This is a placeholder - implement actual legacy logic if needed'
  });
});

// Placeholder for legacy analytics
router.get('/analytics', (req, res) => {
  res.json({
    success: true,
    message: 'Legacy analytics endpoint',
    data: [],
    note: 'This is a placeholder - implement actual legacy logic if needed'
  });
});

export { router as legacyRoutes };
