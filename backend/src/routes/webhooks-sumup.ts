import { Router, Request, Response } from 'express';
import { SumUpError } from '../services/sumup-service';
import {
  reconcilePendingSumUpRecharges,
  reconcileSumUpRechargeByExternalId,
  reconcileSumUpRechargeById,
} from '../services/wallet-v2/sumup-recharge.service';

const router = Router();

function readToken(req: Request): string {
  const bearer = String(req.headers.authorization || '');
  if (bearer.toLowerCase().startsWith('bearer ')) return bearer.slice(7).trim();
  return String(req.headers['x-sumup-token'] || req.headers['x-reconcile-token'] || '');
}

// POST /api/webhooks/sumup
// Aceita eventos da SumUp e reconcilia a recarga relacionada por external_id.
router.post('/sumup', async (req: Request, res: Response) => {
  const expected = process.env.SUMUP_WEBHOOK_TOKEN || '';
  if (!expected) {
    return res.status(503).json({ success: false, error: 'Webhook SumUp desabilitado.' });
  }

  const incoming = readToken(req);
  if (!incoming || incoming !== expected) {
    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }

  const checkoutId = String(
    req.body?.checkout_id || req.body?.id || req.body?.checkout?.id || req.body?.data?.id || ''
  ).trim();

  if (!checkoutId) {
    return res.status(400).json({ success: false, error: 'checkout_id obrigatório no payload.' });
  }

  try {
    const result = await reconcileSumUpRechargeByExternalId(checkoutId);
    return res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof SumUpError) {
      return res.status(502).json({ success: false, error: 'Não foi possível verificar pagamento na SumUp.' });
    }
    console.error('[SUMUP_WEBHOOK] Error:', (err as Error).message);
    return res.status(500).json({ success: false, error: 'Erro ao processar webhook SumUp.' });
  }
});

// POST /api/webhooks/sumup/reconcile
// Endpoint interno para reconciliação segura de recargas pendentes.
router.post('/sumup/reconcile', async (req: Request, res: Response) => {
  const expected = process.env.SUMUP_RECONCILE_TOKEN || '';
  if (!expected) {
    return res.status(503).json({ success: false, error: 'Reconciliação SumUp desabilitada.' });
  }

  const incoming = readToken(req);
  if (!incoming || incoming !== expected) {
    return res.status(401).json({ success: false, error: 'Não autorizado.' });
  }

  const rechargeId = typeof req.body?.recharge_id === 'string' ? req.body.recharge_id.trim() : '';
  const limit = Number(req.body?.limit || 50);
  const minAgeMinutes = Number(req.body?.min_age_minutes || 1);

  try {
    if (rechargeId) {
      const result = await reconcileSumUpRechargeById(rechargeId);
      return res.json({
        success: true,
        data: {
          mode: 'single',
          result,
        },
      });
    }

    const batch = await reconcilePendingSumUpRecharges(limit, minAgeMinutes);
    return res.json({ success: true, data: { mode: 'batch', ...batch } });
  } catch (err) {
    if (err instanceof SumUpError) {
      return res.status(502).json({ success: false, error: 'Não foi possível consultar a SumUp na reconciliação.' });
    }
    console.error('[SUMUP_RECONCILE] Error:', (err as Error).message);
    return res.status(500).json({ success: false, error: 'Erro ao executar reconciliação SumUp.' });
  }
});

export default router;
