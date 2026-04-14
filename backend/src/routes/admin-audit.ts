import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { allowReadAccess } from '../middlewares/auth';
import { pool } from '../db';

const router = Router();

// GET /api/admin/audit-logs
router.get('/audit-logs', allowReadAccess, async (req: Request, res: Response) => {
  try {
    const { admin_id, admin_email, entity_type, action, start_date, end_date, limit = '50' } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (admin_id) { conditions.push(`admin_id = $${idx++}`); params.push(admin_id); }
    if (admin_email) { conditions.push(`admin_email = $${idx++}`); params.push(admin_email); }
    if (entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(entity_type); }
    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    if (start_date) { conditions.push(`created_at >= $${idx++}`); params.push(new Date(start_date as string)); }
    if (end_date) { conditions.push(`created_at <= $${idx++}`); params.push(new Date(end_date as string)); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit as string) || 50, 200);

    const { rows: logs } = await pool.query(
      `SELECT a.id, a.admin_id, adm.email as admin_email, adm.name as admin_name,
              a.action, a.entity_type, a.entity_id, a.old_value, a.new_value, a.reason, a.ip_address, a.created_at
       FROM admin_audit_logs a LEFT JOIN admins adm ON a.admin_id = adm.id::text
       ${where} ORDER BY a.created_at DESC LIMIT ${lim}`,
      params
    );
    const { rows: [{ count: total }] } = await pool.query(
      `SELECT COUNT(*)::int as count FROM admin_audit_logs ${where}`,
      params
    );

    res.json({ success: true, logs, pagination: { total, limit: lim, showing: logs.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/login-history
router.get('/login-history', allowReadAccess, async (req: Request, res: Response) => {
  try {
    const { email, success, start_date, end_date, limit = '50' } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (email) { conditions.push(`email = $${idx++}`); params.push(email); }
    if (success !== undefined) { conditions.push(`success = $${idx++}`); params.push(success === 'true'); }
    if (start_date) { conditions.push(`created_at >= $${idx++}`); params.push(new Date(start_date as string)); }
    if (end_date) { conditions.push(`created_at <= $${idx++}`); params.push(new Date(end_date as string)); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit as string) || 50, 200);

    const { rows: logins } = await pool.query(
      `SELECT * FROM admin_login_history ${where} ORDER BY created_at DESC LIMIT ${lim}`,
      params
    );

    res.json({ success: true, logins, total: logins.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
