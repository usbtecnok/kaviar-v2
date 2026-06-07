/**
 * Driver Women Preference — Elegibilidade, opt-in/out para motorista
 *
 * Não altera: disponibilidade, corridas, créditos, localização, push, dispatch.
 */

import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { z } from 'zod';
import * as womenConsent from '../services/women-matching-consent.service';

const router = Router();
router.use(authenticateDriver);

const FEATURE_ENABLED = () => process.env.WOMEN_DRIVER_PREFERENCE_ENABLED === 'true';

const optInSchema = z.object({
  consent_version: z.string().trim().min(1, 'consent_version obrigatório').max(50),
}).strict();

// GET /api/v2/drivers/me/women-preference
router.get('/', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const status = await womenConsent.getStatus('driver', driverId);
    if (!status) return res.status(404).json({ success: false, error: 'Motorista não encontrada' });

    res.json({
      success: true,
      data: {
        eligible: status.women_preference_eligible,
        eligibility_source: status.women_preference_eligibility_source,
        eligible_at: status.women_preference_eligible_at,
        eligibility_revoked_at: status.women_preference_eligibility_revoked_at,
        opt_in: status.women_matching_opt_in,
        participating: status.participating,
        opted_in_at: status.women_matching_opted_in_at,
        opted_out_at: status.women_matching_opted_out_at,
        consent_version: status.women_matching_consent_version,
        feature_enabled: FEATURE_ENABLED(),
      },
    });
  } catch (e) {
    console.error('[DRIVER_WOMEN_PREF_GET]', e);
    res.status(500).json({ success: false, error: 'Erro ao consultar preferência' });
  }
});

// POST /api/v2/drivers/me/women-preference/declare
router.post('/declare', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const parsed = optInSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });

    const result = await womenConsent.declareEligibility('driver', driverId, parsed.data.consent_version);
    if (result.error === 'not_found') return res.status(404).json({ success: false, error: 'Motorista não encontrada' });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[DRIVER_WOMEN_DECLARE]', e);
    res.status(500).json({ success: false, error: 'Erro ao declarar elegibilidade' });
  }
});

// POST /api/v2/drivers/me/women-preference/revoke-declaration
router.post('/revoke-declaration', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const result = await womenConsent.revokeEligibility('driver', driverId);
    if (result.error === 'not_found') return res.status(404).json({ success: false, error: 'Motorista não encontrada' });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[DRIVER_WOMEN_REVOKE]', e);
    res.status(500).json({ success: false, error: 'Erro ao revogar elegibilidade' });
  }
});

// POST /api/v2/drivers/me/women-preference/opt-in
router.post('/opt-in', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const parsed = optInSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0].message });

    const eligible = await womenConsent.checkEligibility('driver', driverId);
    if (!eligible) return res.status(403).json({ success: false, error: 'Elegibilidade necessária antes do opt-in' });

    const result = await womenConsent.optIn('driver', driverId, parsed.data.consent_version);
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Motorista não encontrada' });
    console.error('[DRIVER_WOMEN_OPT_IN]', e);
    res.status(500).json({ success: false, error: 'Erro ao ativar participação' });
  }
});

// POST /api/v2/drivers/me/women-preference/opt-out
router.post('/opt-out', async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driverId;
    const result = await womenConsent.optOut('driver', driverId);
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'Motorista não encontrada' });
    console.error('[DRIVER_WOMEN_OPT_OUT]', e);
    res.status(500).json({ success: false, error: 'Erro ao desativar participação' });
  }
});

export default router;
