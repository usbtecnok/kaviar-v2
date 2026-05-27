import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();
const TOKEN = process.env.PET_INTAKE_TOKEN || '';

// POST /api/public/pet/intake — Google Forms webhook (via Apps Script)
router.post('/intake', async (req: Request, res: Response) => {
  const incoming = req.headers['x-pet-intake-token'] as string;
  if (!TOKEN || incoming !== TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { name, phone, email, region, vehicle_model, four_doors } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'name must be at least 3 characters' });
  }
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(400).json({ success: false, error: 'phone must have at least 10 digits' });
  }

  try {
    // Anti-duplicidade por telefone (últimos 9 dígitos)
    const suffix = digits.slice(-9);
    const all = await prisma.pet_homologations.findMany({
      where: { phone: { not: '' } },
      select: { id: true, phone: true },
    });
    const existing = all.find(h => h.phone.replace(/\D/g, '').slice(-9) === suffix);
    if (existing) {
      return res.json({ success: true, duplicate: true, id: existing.id });
    }

    const homologation = await prisma.pet_homologations.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        region: region?.trim() || null,
        vehicle_model: vehicle_model?.trim() || null,
        four_doors: four_doors !== false && four_doors !== 'Não',
        source: 'google_forms',
      },
    });

    await prisma.pet_homologation_logs.create({
      data: {
        homologation_id: homologation.id,
        action: 'auto_created',
        admin_id: null,
        admin_name: 'Google Forms',
      },
    });

    console.log(`[PET_INTAKE] created id=${homologation.id} phone=${digits.slice(-4)}`);
    return res.json({ success: true, id: homologation.id });
  } catch (err) {
    console.error('[PET_INTAKE] error:', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
