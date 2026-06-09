import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/local-businesses — lista comércios
router.get('/', authenticateAdmin, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const where: any = {};

    // Filtro territorial: TERRITORIAL_OPERATOR vê apenas comércios da cidade/região do território
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    if (admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER') {
      if (!scope || scope.territoryIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      // Buscar city_names dos territórios do operador
      const territories = await prisma.operational_territories.findMany({
        where: { id: { in: scope.territoryIds } },
        select: { city_name: true },
      });
      const cityNames = territories.map(t => t.city_name).filter(Boolean) as string[];
      if (cityNames.length > 0) {
        where.OR = cityNames.map(city => ({ region_slug: { contains: city, mode: 'insensitive' as const } }));
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const businesses = await prisma.local_businesses.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: businesses });
  } catch (error) {
    console.error('[admin-local-businesses] list error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar comércios' });
  }
});

// GET /api/admin/local-businesses/:id — carrega um comércio
router.get('/:id', authenticateAdmin, applyTerritoryScope, async (req: Request, res: Response) => {
  try {
    const business = await prisma.local_businesses.findUnique({
      where: { id: req.params.id },
    });
    if (!business) {
      return res.status(404).json({ success: false, error: 'Comércio não encontrado' });
    }

    // Territory scope check for non-SUPER_ADMIN
    const admin = (req as any).admin;
    if (admin.role !== 'SUPER_ADMIN') {
      const scope = (req as any).territoryScope;
      if (!scope || (!scope.territoryIds?.length && !scope.neighborhoodIds?.length)) {
        return res.status(404).json({ success: false, error: 'Comércio não encontrado' });
      }
      // Resolve neighborhood names → slugs for the admin's territory
      const neighborhoods = await prisma.neighborhoods.findMany({
        where: { id: { in: scope.neighborhoodIds || [] }, is_active: true },
        select: { name: true },
      });
      const slugify = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const allowedSlugs = neighborhoods.map(n => slugify(n.name));
      if (!business.region_slug || !allowedSlugs.includes(business.region_slug.toLowerCase())) {
        return res.status(404).json({ success: false, error: 'Comércio não encontrado' });
      }
    }

    res.json({ success: true, data: business });
  } catch (error) {
    console.error('[admin-local-businesses] get error:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar comércio' });
  }
});

// POST /api/admin/local-businesses — cria um novo comércio
router.post('/', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category, description, whatsapp, address, logo_url, region_slug, is_active } = req.body;
    if (!name || !region_slug) {
      return res.status(400).json({ success: false, error: 'name e region_slug são obrigatórios' });
    }
    const business = await prisma.local_businesses.create({
      data: {
        name,
        category: category || 'outro',
        description: description || null,
        whatsapp: whatsapp || null,
        address: address || null,
        logo_url: logo_url || null,
        region_slug,
        is_active: typeof is_active === 'boolean' ? is_active : true,
      },
    });
    res.status(201).json({ success: true, data: business });
  } catch (error) {
    console.error('[admin-local-businesses] create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar comércio' });
  }
});

// PATCH /api/admin/local-businesses/:id — atualiza (inclui ativar/desativar via is_active)
router.patch('/:id', authenticateAdmin, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, category, description, whatsapp, address, logo_url, region_slug, is_active } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description || null;
    if (whatsapp !== undefined) data.whatsapp = whatsapp || null;
    if (address !== undefined) data.address = address || null;
    if (logo_url !== undefined) data.logo_url = logo_url || null;
    if (region_slug !== undefined) data.region_slug = region_slug;
    if (is_active !== undefined) data.is_active = is_active;

    const business = await prisma.local_businesses.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: business });
  } catch (error) {
    console.error('[admin-local-businesses] update error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar comércio' });
  }
});

export default router;
