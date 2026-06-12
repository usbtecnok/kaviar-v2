import { Router } from 'express';
import { pool } from '../db';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, allowReadAccess, allowFinanceAccess } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { applyCreditDelta } from '../services/credit.service';
import { auditWrite } from '../middlewares/audit-write';

const router = Router();

router.use(authenticateAdmin);

// GET /api/admin/drivers/:driverId/credits/balance
router.get('/:driverId/credits/balance', allowReadAccess, applyTerritoryScope, async (req, res) => {
  try {
    // Scope check
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    if (admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER') {
      if (!scope || scope.neighborhoodIds.length === 0) return res.status(403).json({ error: 'Acesso negado' });
      const driver = await prisma.drivers.findUnique({ where: { id: req.params.driverId }, select: { neighborhood_id: true } });
      if (!driver || !driver.neighborhood_id || !scope.neighborhoodIds.includes(driver.neighborhood_id)) {
        return res.status(403).json({ error: 'Motorista fora do seu território' });
      }
    }

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
router.get('/:driverId/credits/ledger', allowReadAccess, applyTerritoryScope, async (req, res) => {
  try {
    // Scope check
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    if (admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER') {
      if (!scope || scope.neighborhoodIds.length === 0) return res.status(403).json({ error: 'Acesso negado' });
      const driver = await prisma.drivers.findUnique({ where: { id: req.params.driverId }, select: { neighborhood_id: true } });
      if (!driver || !driver.neighborhood_id || !scope.neighborhoodIds.includes(driver.neighborhood_id)) {
        return res.status(403).json({ error: 'Motorista fora do seu território' });
      }
    }

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
    const { delta, reason, idempotencyKey, referredBy, password } = req.body;
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

    // Re-authenticate admin for exceptional adjustment
    if (!password) {
      return res.status(400).json({ error: 'Senha do admin é obrigatória para ajuste excepcional' });
    }
    const bcrypt = require('bcryptjs');
    const admin = await pool.query('SELECT password FROM admins WHERE id = $1', [adminUserId]);
    if (!admin.rows[0] || !(await bcrypt.compare(password, admin.rows[0].password))) {
      return res.status(401).json({ error: 'Senha incorreta' });
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

    // Apply to Wallet V2 (blocking — must succeed)
    const { WalletService } = require('../services/wallet-v2/wallet.service');
    const walletSvc = new WalletService(pool);
    await walletSvc.ensureWallet(driverId);
    const deltaCents = Math.round(parseFloat(delta) * 100);
    if (deltaCents > 0) {
      await walletSvc.creditRecharge(driverId, BigInt(deltaCents), `admin-adjust:${idempotencyKey}`);
    } else if (deltaCents < 0) {
      const balCheck = await walletSvc.getBalance(driverId);
      if (balCheck.available_cents < BigInt(Math.abs(deltaCents))) {
        return res.status(400).json({ error: 'Saldo insuficiente para débito' });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE driver_wallets SET balance_cents = balance_cents + $2, updated_at = NOW() WHERE driver_id = $1', [driverId, deltaCents]);
        const balAfter = await client.query('SELECT balance_cents, reserved_cents FROM driver_wallets WHERE driver_id = $1', [driverId]);
        await client.query("INSERT INTO wallet_ledger (driver_id, entry_type, balance_delta_cents, reserved_delta_cents, balance_after_cents, reserved_after_cents, reference_type, reference_id, actor_type, actor_id, reason, idempotency_key) VALUES ($1,'correction',$2,0,$3,$4,'correction',$5,'admin',$6,$7,$8)", [driverId, deltaCents, balAfter.rows[0].balance_cents, balAfter.rows[0].reserved_cents, idempotencyKey, adminUserId, reason.trim(), `admin-adjust:${idempotencyKey}`]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }

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
