import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  calculateTerritorialMatch, 
  logMatch, 
  updateMatchConfig,
  getMatchStats 
} from '../services/territorial-match';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/match/calculate - Calcular match territorial (autenticado)
router.post('/calculate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { driverId, pickupLat, pickupLng, tripValueBrl } = req.body;

    if (!driverId || !pickupLat || !pickupLng || !tripValueBrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const matchResult = await calculateTerritorialMatch(
      driverId,
      Number(pickupLat),
      Number(pickupLng),
      Number(tripValueBrl)
    );

    res.json(matchResult);
  } catch (error) {
    console.error('Error calculating match:', error);
    res.status(500).json({ error: 'Failed to calculate match' });
  }
});

// GET /api/match/config - Obter configuração atual (admin)
router.get('/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = await prisma.$queryRaw<Array<{
      match_local_percent: number;
      match_bairro_percent: number;
      match_externo_percent: number;
    }>>`
      SELECT match_local_percent, match_bairro_percent, match_externo_percent 
      FROM match_config WHERE id = 'default' LIMIT 1
    `;

    res.json(config[0] || {
      match_local_percent: 7.00,
      match_bairro_percent: 12.00,
      match_externo_percent: 20.00
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT /api/match/config - Atualizar configuração (Admin)
router.put('/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { matchLocalPercent, matchBairroPercent, matchExternoPercent } = req.body;
    const adminId = (req as any).user?.id || 'system';

    if (matchLocalPercent === undefined || matchBairroPercent === undefined || matchExternoPercent === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await updateMatchConfig(
      Number(matchLocalPercent),
      Number(matchBairroPercent),
      Number(matchExternoPercent),
      adminId
    );

    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// GET /api/match/stats - Estatísticas de match (admin)
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await getMatchStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/match/monitor - Monitor em tempo real (últimos 50 matches) (admin)
router.get('/monitor', requireAdmin, async (req: Request, res: Response) => {
  try {
    const matches = await prisma.$queryRaw<Array<{
      id: string;
      driver_name: string;
      passenger_name: string;
      match_type: string;
      platform_percent: number;
      platform_fee_brl: number;
      trip_value_brl: number;
      neighborhood_name: string | null;
      created_at: Date;
    }>>`
      SELECT 
        ml.id,
        d.name as driver_name,
        p.name as passenger_name,
        ml.match_type,
        ml.platform_percent,
        ml.platform_fee_brl,
        ml.trip_value_brl,
        n.name as neighborhood_name,
        ml.created_at
      FROM match_logs ml
      JOIN drivers d ON ml.driver_id = d.id
      JOIN passengers p ON ml.passenger_id = p.id
      LEFT JOIN neighborhoods n ON ml.neighborhood_id = n.id
      ORDER BY ml.created_at DESC
      LIMIT 50
    `;

    res.json(matches);
  } catch (error) {
    console.error('Error fetching monitor:', error);
    res.status(500).json({ error: 'Failed to fetch monitor data' });
  }
});

// POST /api/drivers/base - Atualizar base do motorista (autenticado)
router.post('/drivers/base', requireAuth, async (req: Request, res: Response) => {
  try {
    const { driverId, lat, lng, address } = req.body;

    if (!driverId || !lat || !lng || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await prisma.$executeRaw`
      UPDATE drivers 
      SET base_lat = ${Number(lat)},
          base_lng = ${Number(lng)},
          base_address = ${address},
          base_verified = FALSE
      WHERE id = ${driverId}
    `;

    res.json({ success: true, message: 'Base location updated. Awaiting admin verification.' });
  } catch (error) {
    console.error('Error updating base:', error);
    res.status(500).json({ error: 'Failed to update base location' });
  }
});

// POST /api/passengers/addresses - Adicionar endereço frequente (autenticado)
router.post('/passengers/addresses', requireAuth, async (req: Request, res: Response) => {
  try {
    const { passengerId, label, address, lat, lng, isPrimary } = req.body;

    if (!passengerId || !label || !address || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verificar se já tem 3 endereços
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM passenger_addresses WHERE passenger_id = ${passengerId}
    `;

    if (Number(count[0].count) >= 3) {
      return res.status(400).json({ error: 'Maximum 3 addresses allowed' });
    }

    await prisma.$executeRaw`
      INSERT INTO passenger_addresses (passenger_id, label, address, lat, lng, is_primary)
      VALUES (${passengerId}, ${label}, ${address}, ${Number(lat)}, ${Number(lng)}, ${isPrimary || false})
    `;

    res.json({ success: true, message: 'Address added' });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// GET /api/passengers/:id/addresses - Listar endereços do passageiro (autenticado)
router.get('/passengers/:id/addresses', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const addresses = await prisma.$queryRaw<Array<{
      id: string;
      label: string;
      address: string;
      lat: number;
      lng: number;
      is_primary: boolean;
    }>>`
      SELECT id, label, address, lat, lng, is_primary
      FROM passenger_addresses
      WHERE passenger_id = ${id}
      ORDER BY is_primary DESC, created_at ASC
    `;

    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

export default router;
