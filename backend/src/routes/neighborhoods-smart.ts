import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSmartNeighborhoodList } from '../services/territory-service';

const router = Router();

const smartListQuerySchema = z.object({
  lat: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  lng: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
});

/**
 * GET /api/neighborhoods/smart-list
 * Lista inteligente de bairros com detecção automática via GPS
 * 
 * Retrocompatível: data = array (all), detected/nearby no top-level
 */
router.get('/smart-list', async (req: Request, res: Response) => {
  try {
    const query = smartListQuerySchema.parse(req.query);

    const result = await getSmartNeighborhoodList(query.lat, query.lng);

    return res.status(200).json({
      success: true,
      data: result.all,
      detected: result.detected,
      nearby: result.nearby,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar lista de bairros',
    });
  }
});

export default router;
