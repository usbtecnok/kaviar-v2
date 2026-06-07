/**
 * Passenger Women Preference — Opt-in/out + preferência padrão
 *
 * Não altera: dispatch, rides, créditos, pricing, push.
 */

import { Router, Request, Response } from 'express';
import { authenticatePassenger } from '../middlewares/auth';
import { z } from 'zod';
import * as womenConsent from '../services/women-matching-consent.service';

const router = Router();
router.use(authenticatePassenger);

const FEATURE_ENABLED = () => process.env.WOMEN_DRIVER_PREFERENCE_ENABLED === 'true';

const optInSchema = z.object({
  consent_version: z.string().trim().min(1, 'consent_version obrigatório').max(50),
}).strict();

const defaultSchema = z.object({
  prefer_woman_driver_default: z.boolean(),
}).strict();

// GET /api/v2/passengers/me/women-preference
router.get('/', async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const status = await womenConsent.getStatus('passenger', passengerId);

    if (!status) return res.status(404).json({ success: false, error: 'Passageira não encontrada' });

    res.json({
      success: true,
      data: {
        opt_in: status.women_matching_opt_in,
        prefer_woman_driver_default: status.prefer_woman_driver_default,
        opted_in_at: status.women_matching_opted_in_at,
        opted_out_at: status.women_matching_opted_out_at,
        consent_version: status.women_matching_consent_version,
        feature_enabled: FEATURE_ENABLED(),
      },
    });
  } catch (e) {
    console.error('[PASSENGER_WOMEN_PREF_GET]', e);
    res.status(500).json({ success: false, error: 'Erro ao consultar preferência' });
  }
});

// POST /api/v2/passengers/me/women-preference/opt-in
router.post('/opt-in', async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const parsed = optInSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });

    const result = await womenConsent.optIn('passenger', passengerId, parsed.data.consent_version);
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Passageira não encontrada' });
    console.error('[PASSENGER_WOMEN_OPT_IN]', e);
    res.status(500).json({ success: false, error: 'Erro ao ativar participação' });
  }
});

// POST /api/v2/passengers/me/women-preference/opt-out
router.post('/opt-out', async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const result = await womenConsent.optOut('passenger', passengerId);
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Passageira não encontrada' });
    console.error('[PASSENGER_WOMEN_OPT_OUT]', e);
    res.status(500).json({ success: false, error: 'Erro ao desativar participação' });
  }
});

// PUT /api/v2/passengers/me/women-preference/default
router.put('/default', async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passengerId;
    const parsed = defaultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });

    const result = await womenConsent.setDefaultPreference(passengerId, parsed.data.prefer_woman_driver_default);
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Passageira não encontrada' });
    if (e.message === 'OPT_IN_REQUIRED') return res.status(400).json({ success: false, error: 'Participe do programa antes de ativar a preferência' });
    console.error('[PASSENGER_WOMEN_DEFAULT]', e);
    res.status(500).json({ success: false, error: 'Erro ao alterar preferência' });
  }
});

export default router;
