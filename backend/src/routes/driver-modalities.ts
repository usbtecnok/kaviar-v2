import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateDriver } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

const VALID_MODALITIES = ['CAR', 'MOTO_DELIVERY', 'MOTO_PASSENGER'];

// GET /api/drivers/me/modalities
router.get('/me/modalities', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driver.id;
    const modalities = await prisma.driver_modalities.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'asc' },
    });
    res.json({ success: true, data: modalities });
  } catch { res.status(500).json({ success: false, error: 'Erro ao listar modalidades' }); }
});

// POST /api/drivers/me/modalities
router.post('/me/modalities', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driver.id;
    const { modality, vehicle_plate, vehicle_model, vehicle_color, vehicle_year, vehicle_brand, cnh_category, has_extra_helmet } = req.body;

    if (!modality || !VALID_MODALITIES.includes(modality)) {
      return res.status(400).json({ success: false, error: `Modalidade inválida. Válidas: ${VALID_MODALITIES.join(', ')}` });
    }

    const existing = await prisma.driver_modalities.findUnique({
      where: { driver_id_modality: { driver_id: driverId, modality } },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Modalidade já cadastrada', data: existing });
    }

    const created = await prisma.driver_modalities.create({
      data: {
        driver_id: driverId, modality,
        vehicle_plate: vehicle_plate || null,
        vehicle_model: vehicle_model || null,
        vehicle_color: vehicle_color || null,
        vehicle_year: vehicle_year ? parseInt(vehicle_year) : null,
        vehicle_brand: vehicle_brand || null,
        cnh_category: cnh_category || null,
        has_extra_helmet: modality === 'MOTO_PASSENGER' ? (has_extra_helmet ?? false) : false,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao adicionar modalidade' });
  }
});

// PATCH /api/drivers/me/modalities/:id
router.patch('/me/modalities/:id', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).driver.id;
    const existing = await prisma.driver_modalities.findFirst({
      where: { id: req.params.id, driver_id: driverId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Modalidade não encontrada' });

    const { vehicle_plate, vehicle_model, vehicle_color, vehicle_year, vehicle_brand, cnh_category, has_extra_helmet } = req.body;
    const data: any = {};
    if (vehicle_plate !== undefined) data.vehicle_plate = vehicle_plate;
    if (vehicle_model !== undefined) data.vehicle_model = vehicle_model;
    if (vehicle_color !== undefined) data.vehicle_color = vehicle_color;
    if (vehicle_year !== undefined) data.vehicle_year = vehicle_year ? parseInt(vehicle_year) : null;
    if (vehicle_brand !== undefined) data.vehicle_brand = vehicle_brand;
    if (cnh_category !== undefined) data.cnh_category = cnh_category;
    if (has_extra_helmet !== undefined && existing.modality === 'MOTO_PASSENGER') data.has_extra_helmet = has_extra_helmet;

    const updated = await prisma.driver_modalities.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: updated });
  } catch { res.status(500).json({ success: false, error: 'Erro ao atualizar modalidade' }); }
});

export default router;
