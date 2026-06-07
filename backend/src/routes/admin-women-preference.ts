import { Router, Request, Response } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { pool } from '../db';

const router = Router();
router.use(authenticateAdmin);
router.use(requireSuperAdmin);

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone: string | null): string {
  if (!phone) return '';
  return '***' + phone.slice(-4);
}

// GET /summary
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM passengers WHERE women_matching_opt_in = true)::int AS passengers_opted_in,
        (SELECT COUNT(*) FROM drivers WHERE women_matching_opt_in = true)::int AS drivers_opted_in,
        (SELECT COUNT(*) FROM women_matching_consent_events WHERE action IN ('opt_out'))::int AS total_opt_outs,
        (SELECT COUNT(*) FROM women_matching_consent_events)::int AS total_events,
        (SELECT COUNT(*) FROM passengers WHERE prefer_woman_driver_default = true)::int AS passengers_prefer_default
    `);
    const row = result.rows[0];
    res.json({
      ...row,
      feature_enabled: process.env.WOMEN_DRIVER_PREFERENCE_ENABLED === 'true',
    });
  } catch (err) {
    console.error('[admin-women-preference] summary error:', (err as Error).message);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

// GET /participants
// Somente quem já interagiu com o programa (opt-in, opt-out ou consentimento registrado)
router.get('/participants', async (req: Request, res: Response) => {
  try {
    const { actor_type = 'passenger', status, search, limit = '20', offset = '0' } = req.query;
    const lim = Math.min(parseInt(limit as string) || 20, 100);
    const off = parseInt(offset as string) || 0;

    const table = actor_type === 'driver' ? 'drivers' : 'passengers';
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    // Base: somente participantes reais (interagiram com o programa)
    conditions.push(`(women_matching_opt_in = true OR women_matching_opted_in_at IS NOT NULL OR women_matching_opted_out_at IS NOT NULL OR women_matching_consent_version IS NOT NULL)`);

    if (status === 'active') { conditions.push(`women_matching_opt_in = true`); }
    if (status === 'inactive') { conditions.push(`women_matching_opt_in = false`); }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    const extraCol = actor_type !== 'driver' ? ', prefer_woman_driver_default' : '';

    const countQ = `SELECT COUNT(*)::int AS total FROM ${table} ${where}`;
    const dataQ = `
      SELECT id, name, email, phone,
        women_matching_opt_in, women_matching_opted_in_at,
        women_matching_opted_out_at, women_matching_consent_version
        ${extraCol}
      FROM ${table} ${where}
      ORDER BY women_matching_opted_in_at DESC NULLS LAST
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countResult = await pool.query(countQ, params);
    const dataResult = await pool.query(dataQ, [...params, lim, off]);

    const data = dataResult.rows.map((r: any) => ({
      ...r,
      email: maskEmail(r.email),
      phone: maskPhone(r.phone),
      actor_type,
    }));

    res.json({ data, total: countResult.rows[0].total, limit: lim, offset: off });
  } catch (err) {
    console.error('[admin-women-preference] participants error:', (err as Error).message);
    res.status(500).json({ error: 'Erro ao buscar participantes' });
  }
});

// GET /events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { actor_type, actor_id, action, start_date, end_date, limit = '50', offset = '0' } = req.query;
    const lim = Math.min(parseInt(limit as string) || 50, 200);
    const off = parseInt(offset as string) || 0;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (actor_type) { conditions.push(`actor_type = $${idx++}`); params.push(actor_type); }
    if (actor_id) { conditions.push(`actor_id = $${idx++}`); params.push(actor_id); }
    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    if (start_date) { conditions.push(`created_at >= $${idx++}`); params.push(start_date); }
    if (end_date) { conditions.push(`created_at <= $${idx++}`); params.push(end_date); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countQ = `SELECT COUNT(*)::int AS total FROM women_matching_consent_events ${where}`;
    const dataQ = `
      SELECT id, actor_type, actor_id, action, consent_version, source, created_at
      FROM women_matching_consent_events ${where}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countResult = await pool.query(countQ, params);
    const dataResult = await pool.query(dataQ, [...params, lim, off]);

    res.json({ data: dataResult.rows, total: countResult.rows[0].total, limit: lim, offset: off });
  } catch (err) {
    console.error('[admin-women-preference] events error:', (err as Error).message);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

export default router;
