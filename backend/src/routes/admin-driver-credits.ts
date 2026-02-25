import { Router } from 'express';
import { pool } from '../db';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();

// Transactional and idempotent credit adjustment
async function applyCreditDelta(
  driverId: string,
  delta: number,
  reason: string,
  adminUserId: string,
  idempotencyKey?: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check idempotency
    if (idempotencyKey) {
      const existing = await client.query(
        'SELECT id, balance_after FROM driver_credit_ledger WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return { alreadyProcessed: true, balance: existing.rows[0].balance_after };
      }
    }

    // Upsert balance
    const balanceResult = await client.query(
      `INSERT INTO credit_balance (driver_id, balance, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (driver_id) DO UPDATE
       SET balance = credit_balance.balance + $2, updated_at = CURRENT_TIMESTAMP
       RETURNING balance`,
      [driverId, delta]
    );

    const newBalance = parseFloat(balanceResult.rows[0].balance);

    // Insert ledger entry
    await client.query(
      `INSERT INTO driver_credit_ledger (driver_id, delta, balance_after, reason, admin_user_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [driverId, delta, newBalance, reason, adminUserId, idempotencyKey]
    );

    await client.query('COMMIT');
    return { alreadyProcessed: false, balance: newBalance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// GET /api/admin/drivers/:driverId/credits/balance
router.get('/:driverId/credits/balance', authenticateAdmin, async (req, res) => {
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
router.get('/:driverId/credits/ledger', authenticateAdmin, async (req, res) => {
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
router.post('/:driverId/credits/adjust', authenticateAdmin, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { delta, reason, idempotencyKey } = req.body;
    const adminUserId = (req as any).adminId || (req as any).admin?.id;

    // Debug log
    console.log('[CREDITS_ADJUST] adminId:', (req as any).adminId, 'admin:', (req as any).admin);

    if (!adminUserId) {
      console.error('[CREDITS_ADJUST] Unauthorized: adminUserId is undefined');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!delta || delta === 0) {
      return res.status(400).json({ error: 'Delta must be non-zero' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await applyCreditDelta(
      driverId,
      parseFloat(delta),
      reason.trim(),
      adminUserId,
      idempotencyKey
    );

    res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      balance: result.balance
    });
  } catch (error) {
    console.error('Error adjusting credits:', error);
    res.status(500).json({ error: 'Failed to adjust credits' });
  }
});

export default router;
