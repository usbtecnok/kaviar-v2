import { Router } from 'express';
import { authRoutes } from './auth';
import { adminRoutes } from './admin';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KAVIAR Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes
router.use('/admin/auth', authRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export { router as apiRoutes };
