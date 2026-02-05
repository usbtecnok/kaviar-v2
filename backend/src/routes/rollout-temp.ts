import { Router } from 'express';

const router = Router();

// Temporary endpoint for Phase 2 rollout - DISABLED IN PROD (missing tables)
router.post('/rollout/set', async (req, res) => {
  return res.status(410).json({ 
    success: false, 
    error: 'rollout-temp desativado (feature flags não provisionadas)' 
  });
});

export { router as rolloutRoutes };
