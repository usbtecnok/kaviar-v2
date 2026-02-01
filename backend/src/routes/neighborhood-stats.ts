import { Router } from 'express';
import { NeighborhoodStatsService } from '../services/neighborhood-stats';

const router = Router();
const statsService = new NeighborhoodStatsService();

router.get('/drivers/:driverId/neighborhood-stats', async (req, res) => {
  try {
    const { driverId } = req.params;
    const period = (req.query.period as 'week' | 'month') || 'month';

    const stats = await statsService.getNeighborhoodStats(driverId, period);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found or no home neighborhood set'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching neighborhood stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch neighborhood stats'
    });
  }
});

export default router;
