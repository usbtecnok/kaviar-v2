import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { prisma } from '../config/database';
import { z } from 'zod';
import { GeoResolveService } from '../services/geo-resolve';

const router = Router();
const geoResolveService = new GeoResolveService();

const completeProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  terms_accepted: z.literal(true, { errorMap: () => ({ message: 'Termos devem ser aceitos' }) }),
  privacy_accepted: z.literal(true, { errorMap: () => ({ message: 'Política de privacidade deve ser aceita' }) }),
  terms_version: z.string().min(1, 'Versão dos termos é obrigatória')
});

// POST /api/drivers/me/complete-profile
router.post('/me/complete-profile', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;
    console.log('[complete-profile] Driver ID:', driverId);
    
    const data = completeProfileSchema.parse(req.body);
    console.log('[complete-profile] Data validated');

    // Resolve geolocation to neighborhood
    const geoResult = await geoResolveService.resolveCoordinates(data.latitude, data.longitude);
    console.log('[complete-profile] Geo result:', geoResult);

    // Update driver basic info and location (without community_id for now)
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        name: data.name,
        phone: data.phone,
        last_lat: data.latitude,
        last_lng: data.longitude,
        last_location_updated_at: new Date(),
        updated_at: new Date()
      }
    });
    console.log('[complete-profile] Driver updated');

    // Store consent in dedicated table
    await prisma.driver_consents.upsert({
      where: { driver_id: driverId },
      create: {
        driver_id: driverId,
        terms_accepted_at: new Date(),
        privacy_accepted_at: new Date(),
        terms_version: data.terms_version
      },
      update: {
        terms_accepted_at: new Date(),
        privacy_accepted_at: new Date(),
        terms_version: data.terms_version
      }
    });
    console.log('[complete-profile] Consent saved');

    res.json({
      success: true,
      message: 'Perfil completado com sucesso',
      data: {
        neighborhood: geoResult.resolvedArea?.name || null,
        profile_complete: true
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: error.errors[0].message 
      });
    }
    console.error('Error completing profile:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao completar perfil'
    });
  }
});

// POST /api/drivers/me/online
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;

    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        status: 'online',
        last_active_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      status: 'online'
    });
  } catch (error) {
    console.error('Error setting driver online:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
    });
  }
});

export default router;
