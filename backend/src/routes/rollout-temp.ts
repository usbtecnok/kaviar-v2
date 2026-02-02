import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Temporary endpoint for Phase 2 rollout - REMOVE AFTER ROLLOUT COMPLETE
router.post('/rollout/set', async (req, res) => {
  try {
    const { feature_key, rollout_percentage, secret } = req.body;
    
    // Simple secret check
    if (secret !== process.env.ROLLOUT_SECRET) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (!feature_key || rollout_percentage === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing feature_key or rollout_percentage' 
      });
    }
    
    // Get current state
    const before = await prisma.feature_flags.findUnique({
      where: { key: feature_key },
    });
    
    if (!before) {
      return res.status(404).json({ 
        success: false, 
        error: 'Feature flag not found' 
      });
    }
    
    // Update rollout
    const after = await prisma.feature_flags.update({
      where: { key: feature_key },
      data: { 
        rollout_percentage: parseInt(rollout_percentage),
        updated_at: new Date(),
      },
    });
    
    console.log(`[Rollout] ${feature_key}: ${before.rollout_percentage}% → ${after.rollout_percentage}%`);
    
    res.json({
      success: true,
      before: {
        rollout_percentage: before.rollout_percentage,
        enabled: before.enabled,
        updated_at: before.updated_at,
      },
      after: {
        rollout_percentage: after.rollout_percentage,
        enabled: after.enabled,
        updated_at: after.updated_at,
      },
    });
  } catch (error) {
    console.error('[Rollout] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as rolloutRoutes };
