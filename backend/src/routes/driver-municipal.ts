import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticateDriver } from '../middlewares/auth';
import {
  canDriverOperateInMunicipality,
  getDriverMunicipalStatus,
  getMunicipalRegulation,
  mapServiceCategoryToMunicipalModality,
  MUNICIPAL_MODALITIES,
  normalizeCity,
  normalizeState,
} from '../services/municipal-regulation.service';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticateDriver);

const requirementsQuerySchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  modality: z.enum(MUNICIPAL_MODALITIES).optional(),
});

async function resolveDriverMunicipality(driverId: string) {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: {
      vehicle_type: true,
      neighborhoods: {
        select: {
          city: true,
          territory: {
            select: { uf: true },
          },
        },
      },
    },
  });

  if (!driver) return null;

  return {
    city: driver.neighborhoods?.city || null,
    state: driver.neighborhoods?.territory?.uf || null,
    inferredModality: driver.vehicle_type === 'MOTORCYCLE' ? 'MOTO_PASSENGER' : 'CAR',
  };
}

// GET /api/v2/driver/municipal-requirements?city=...&state=...&modality=...
router.get('/municipal-requirements', async (req: Request, res: Response) => {
  try {
    const parsed = requirementsQuerySchema.parse({
      city: req.query.city,
      state: req.query.state,
      modality: req.query.modality,
    });

    const driverId = (req as any).driverId;
    const inferred = await resolveDriverMunicipality(driverId);

    const city = parsed.city ? normalizeCity(parsed.city) : inferred?.city;
    const state = parsed.state ? normalizeState(parsed.state) : inferred?.state;
    const modality = parsed.modality || (inferred?.inferredModality as any) || mapServiceCategoryToMunicipalModality('CAR_NORMAL');

    if (!city || !state) {
      return res.status(400).json({ success: false, error: 'Cidade/UF não informadas e não foi possível inferir pelo cadastro atual.' });
    }

    const regulation = await getMunicipalRegulation(city, state, modality);

    if (!regulation) {
      return res.json({
        success: true,
        data: {
          hasRegulation: false,
          city,
          state,
          modality,
          message: 'Nenhuma regra municipal ativa para esta cidade/modalidade.',
          requirements: [],
        },
      });
    }

    const requirements = regulation.requirements.map((item) => ({
      id: item.id,
      requirement_key: item.requirement_key,
      label: item.label,
      description: item.description,
      document_type: item.document_type,
      is_required: item.is_required,
      applies_when: item.applies_when,
      sort_order: item.sort_order,
    }));

    res.json({
      success: true,
      data: {
        hasRegulation: true,
        city,
        state,
        modality,
        regulation: {
          id: regulation.id,
          regulation_status: regulation.regulation_status,
          requires_city_approval: regulation.requires_city_approval,
          requires_protocol: regulation.requires_protocol,
          max_vehicle_age_years: regulation.max_vehicle_age_years,
          responsible_agency: regulation.responsible_agency,
          notes: regulation.notes,
          law_number: regulation.law_number,
          law_date: regulation.law_date,
          law_document_url: regulation.law_document_url,
        },
        requirements,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Parâmetros inválidos.' });
    }

    console.error('[DRIVER_MUNICIPAL_REQUIREMENTS_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar requisitos municipais.' });
  }
});

// GET /api/v2/driver/municipal-status
router.get('/municipal-status', async (req: Request, res: Response) => {
  try {
    const parsed = requirementsQuerySchema.parse({
      city: req.query.city,
      state: req.query.state,
      modality: req.query.modality,
    });

    const driverId = (req as any).driverId;
    const inferred = await resolveDriverMunicipality(driverId);

    const city = parsed.city ? normalizeCity(parsed.city) : inferred?.city;
    const state = parsed.state ? normalizeState(parsed.state) : inferred?.state;
    const modality = parsed.modality || (inferred?.inferredModality as any) || mapServiceCategoryToMunicipalModality('CAR_NORMAL');

    if (!city || !state) {
      return res.status(400).json({ success: false, error: 'Cidade/UF não informadas e não foi possível inferir pelo cadastro atual.' });
    }

    const status = await getDriverMunicipalStatus(driverId, city, state, modality);
    const operationGate = await canDriverOperateInMunicipality(driverId, city, state, modality);

    res.json({
      success: true,
      data: {
        ...status,
        operationGate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Parâmetros inválidos.' });
    }

    console.error('[DRIVER_MUNICIPAL_STATUS_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar status municipal.' });
  }
});

export default router;
