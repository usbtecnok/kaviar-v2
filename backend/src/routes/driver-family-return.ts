import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();
router.use(authenticateDriver);

// GET /api/v2/drivers/me/family-return
router.get('/', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const flag = await pool.query("SELECT enabled FROM feature_flags WHERE key = 'FAMILY_RETURN_ENABLED' LIMIT 1");
    const enabled = flag.rows[0]?.enabled === true;
    const percent = parseInt(process.env.FAMILY_RETURN_PERCENT || '0');
    const requestStart = process.env.FAMILY_RETURN_REQUEST_START || '';
    const requestEnd = process.env.FAMILY_RETURN_REQUEST_END || '';

    if (!enabled || percent <= 0) {
      return res.json({ success: true, data: { enabled: false, accrued_cents: 0, message: 'Programa não ativo no momento.' } });
    }

    const result = await pool.query(
      "SELECT COALESCE(SUM(accrued_amount_cents), 0)::bigint as total FROM family_return_accruals WHERE driver_id = $1 AND status = 'accrued'",
      [driverId]
    );
    const accruedCents = Number(result.rows[0].total);
    const now = new Date();
    const availableForRequest = requestStart && requestEnd ? (now >= new Date(requestStart) && now <= new Date(requestEnd)) : false;

    res.json({
      success: true,
      data: {
        enabled: true,
        percent,
        accrued_cents: accruedCents,
        available_for_request: availableForRequest,
        request_start: requestStart || null,
        request_end: requestEnd || null,
        message: `Você acumula ${percent}% das recargas no Retorno Familiar KAVIAR. Solicitação disponível entre outubro e dezembro.`,
      },
    });
  } catch (err) {
    console.error('[family-return] GET error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'Erro ao consultar retorno familiar' });
  }
});

export default router;
