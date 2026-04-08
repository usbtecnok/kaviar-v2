import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticateDriver } from '../middlewares/auth';
import { ensureAsaasCustomer, createPixPayment } from '../services/asaas.service';
import crypto from 'crypto';

const router = Router();

// GET /api/v2/drivers/me/credits/packages
router.get('/me/credits/packages', authenticateDriver, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, credits, price FROM credit_packages WHERE active = true ORDER BY credits'
    );
    res.json({ success: true, data: rows.map((r: any) => ({ id: r.id, credits: r.credits, price: parseFloat(r.price), priceCents: Math.round(parseFloat(r.price) * 100) })) });
  } catch (err: any) {
    console.error('[CREDIT_PACKAGES]', err.message);
    res.status(500).json({ success: false, error: 'Erro ao listar pacotes' });
  }
});

// POST /api/v2/drivers/me/credits/purchase
router.post('/me/credits/purchase', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ success: false, error: 'packageId obrigatório' });

    // Busca pacote
    const pkg = await pool.query('SELECT * FROM credit_packages WHERE id = $1 AND active = true', [packageId]);
    if (!pkg.rows[0]) return res.status(404).json({ success: false, error: 'Pacote não encontrado' });
    const p = pkg.rows[0];
    const priceCents = Math.round(parseFloat(p.price) * 100);
    const credits = p.credits;

    // Garante customer no Asaas
    const customerId = await ensureAsaasCustomer(driverId);

    // Referência única
    const extRef = `kv_${driverId.slice(-8)}_${crypto.randomBytes(4).toString('hex')}`;

    // Cria cobrança Pix
    const pix = await createPixPayment(customerId, priceCents, extRef, `KAVIAR: ${credits} créditos`);

    // Salva purchase
    await pool.query(
      `INSERT INTO driver_credit_purchases
        (driver_id, package_id, asaas_customer_id, asaas_payment_id, billing_type, status, amount_cents, credits_amount, external_reference, pix_qr_code, pix_copy_paste, pix_expires_at)
       VALUES ($1,$2,$3,$4,'PIX','pending',$5,$6,$7,$8,$9,$10)`,
      [driverId, p.id, customerId, pix.paymentId, priceCents, credits, extRef, pix.qrCode, pix.copyPaste, pix.expirationDate]
    );

    console.log(`[CREDIT_PURCHASE] driver=${driverId} credits=${credits} amount=${priceCents} asaas=${pix.paymentId}`);

    res.json({
      success: true,
      data: {
        purchaseId: extRef,
        status: 'pending',
        amountCents: priceCents,
        credits,
        pix: { qrCode: pix.qrCode, copyPaste: pix.copyPaste, expiresAt: pix.expirationDate },
        invoiceUrl: pix.invoiceUrl,
      },
    });
  } catch (err: any) {
    console.error('[CREDIT_PURCHASE_ERROR]', err);
    res.status(500).json({ success: false, error: err.message || 'Erro ao criar cobrança' });
  }
});

// GET /api/v2/drivers/me/credits/purchases
router.get('/me/credits/purchases', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const { rows } = await pool.query(
      `SELECT id, status, credits_amount, amount_cents, billing_type, created_at, paid_at
       FROM driver_credit_purchases WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [driverId]
    );
    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('[CREDIT_PURCHASES_LIST]', err);
    res.status(500).json({ success: false, error: 'Erro ao listar compras' });
  }
});

export default router;
