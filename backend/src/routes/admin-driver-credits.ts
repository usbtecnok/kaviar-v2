import { Router } from 'express';
import { pool } from '../db';
import { authenticateAdmin, allowReadAccess, allowFinanceAccess } from '../middlewares/auth';
import { applyCreditDelta } from '../services/credit.service';
import { auditWrite } from '../middlewares/audit-write';

const router = Router();

router.use(authenticateAdmin);

// GET /api/admin/drivers/:driverId/credits/balance
router.get('/:driverId/credits/balance', allowReadAccess, async (req, res) => {
  try {
    const { driverId } = req.params;
    const result = await pool.query(
      'SELECT balance, updated_at FROM credit_balance WHERE driver_id = $1',
      [driverId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ balance: 0, updated_at: null });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
});

// GET /api/admin/drivers/:driverId/credits/ledger
router.get('/:driverId/credits/ledger', allowReadAccess, async (req, res) => {
  try {
    const { driverId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [entries, count] = await Promise.all([
      pool.query(
        `SELECT id, delta, balance_after, reason, admin_user_id, created_at
         FROM driver_credit_ledger
         WHERE driver_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [driverId, limit, offset]
      ),
      pool.query(
        'SELECT COUNT(*) FROM driver_credit_ledger WHERE driver_id = $1',
        [driverId]
      )
    ]);

    res.json({
      entries: entries.rows,
      total: parseInt(count.rows[0].count),
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching credit ledger:', error);
    res.status(500).json({ error: 'Failed to fetch credit ledger' });
  }
});

// POST /api/admin/drivers/:driverId/credits/adjust
router.post('/:driverId/credits/adjust', allowFinanceAccess, async (req, res) => {
  console.log('🔍 [CREDITS_ADJUST] POST recebido:', {
    driverId: req.params.driverId,
    headers: {
      authorization: req.headers.authorization ? '✅ presente' : '❌ ausente',
      origin: req.headers.origin,
      contentType: req.headers['content-type']
    },
    body: req.body,
    adminId: (req as any).adminId,
    admin: (req as any).admin
  });

  try {
    const { driverId } = req.params;
    const { delta, reason, idempotencyKey, referredBy } = req.body;
    const adminUserId = (req as any).adminId || (req as any).admin?.id;

    if (!adminUserId) {
      console.error('❌ [CREDITS_ADJUST] Unauthorized: adminUserId is undefined. adminId:', (req as any).adminId, 'admin:', (req as any).admin);
      return res.status(401).json({ success: false, error: 'Unauthorized: admin user not found' });
    }

    if (!delta || delta === 0) {
      return res.status(400).json({ error: 'Delta must be non-zero' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      return res.status(400).json({ error: 'idempotencyKey is required for manual credit adjustments' });
    }

    // Record referral on first credit purchase (auditable, immutable)
    if (referredBy && parseFloat(delta) > 0) {
      const driver = await pool.query(
        'SELECT referred_by FROM drivers WHERE id = $1',
        [driverId]
      );
      if (driver.rows.length > 0 && !driver.rows[0].referred_by) {
        await pool.query(
          'UPDATE drivers SET referred_by = $1, referred_at = CURRENT_TIMESTAMP WHERE id = $2',
          [referredBy.trim(), driverId]
        );
        await pool.query(
          `INSERT INTO driver_referral_log (driver_id, referred_by, source)
           VALUES ($1, $2, 'first_credit_purchase')`,
          [driverId, referredBy.trim()]
        );
        console.log(`[REFERRAL] driver=${driverId} referred_by=${referredBy.trim()}`);
      }
    }

    const result = await applyCreditDelta(
      driverId,
      parseFloat(delta),
      reason.trim(),
      adminUserId,
      idempotencyKey
    );

    // Audit with before/after balance
    const { audit, auditCtx } = require('../utils/audit');
    const ctx = auditCtx(req);
    audit({
      adminId: ctx.adminId, adminEmail: ctx.adminEmail,
      action: 'adjust_credits', entityType: 'driver_credits', entityId: driverId,
      oldValue: { balance: result.balance - parseFloat(delta) },
      newValue: { balance: result.balance, delta: parseFloat(delta), reason: reason.trim(), referredBy: referredBy || null },
      ipAddress: ctx.ip, userAgent: ctx.ua,
    });

    res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      balance: result.balance
    });
  } catch (error: any) {
    console.error('❌ [CREDITS_ADJUST] Error:', {
      message: error.message,
      code: error.code,
      driverId: req.params.driverId,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    res.status(500).json({ 
      error: 'Failed to adjust credits',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message })
    });
  }
});

export default router;
