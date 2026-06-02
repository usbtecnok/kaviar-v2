import { Router } from 'express';
import { authenticateAdmin, requireSuperAdmin, allowReadAccess, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { requireTerritoryScope } from '../middlewares/require-territory-scope';
import { auditWrite } from '../middlewares/audit-write';
import { audit, auditCtx } from '../utils/audit';
import { prisma } from '../lib/prisma';
import { RideAdminController } from '../modules/admin/ride-controller';
import {
  getVirtualFenceCenter,
  updateVirtualFenceCenter,
  deleteVirtualFenceCenter
} from '../controllers/admin/virtualFenceCenter.controller';
import * as passengerFavoritesController from '../controllers/admin/passengerFavorites.controller';
import * as driverSecondaryBaseController from '../controllers/admin/driverSecondaryBase.controller';
import * as featureFlagsController from '../controllers/admin/featureFlags.controller';
import * as betaMonitorController from '../controllers/admin/betaMonitor.controller';
import adminDriverCreditsRoutes from './admin-driver-credits';
import adminCreditPurchasesRoutes from './admin-credit-purchases';

const router = Router();
const rideController = new RideAdminController();

router.use(authenticateAdmin);

// Driver credits routes
router.use('/drivers', adminDriverCreditsRoutes);

// Credit purchases visibility
router.use('/credit-purchases', adminCreditPurchasesRoutes);

// GET /api/admin/admins
router.get('/admins', requireSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar admins' });
  }
});

// GET /api/admin/passengers
router.get('/passengers', allowReadAccess, applyTerritoryScope, requireTerritoryScope, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string || '').trim();
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Escopo territorial: filtra por neighborhood_id se admin tem restrição
    const scope = (req as any).territoryScope;
    if (scope) {
      where.neighborhood_id = { in: scope.neighborhoodIds };
    }

    const [passengers, total] = await Promise.all([
      prisma.passengers.findMany({
        where,
        take: limit,
        skip,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          created_at: true
        }
      }),
      prisma.passengers.count({ where })
    ]);

    res.json({
      success: true,
      data: passengers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar passageiros'
    });
  }
});

// GET /api/admin/passengers/:id
router.get('/passengers/:id', allowReadAccess, applyTerritoryScope, async (req, res) => {
  try {
    const { id } = req.params;
    
    const passenger = await prisma.passengers.findUnique({
      where: { id },
      include: {
        passenger_favorite_locations: {
          orderBy: { created_at: 'desc' }
        },
        neighborhoods: true,
        communities: true
      }
    });

    if (!passenger) {
      return res.status(404).json({
        success: false,
        error: 'Passageiro não encontrado'
      });
    }

    // Scope check: TERRITORIAL_OPERATOR só vê passageiro do seu território
    const admin = (req as any).admin;
    const scope = (req as any).territoryScope;
    if (admin.role === 'TERRITORIAL_OPERATOR') {
      if (!scope || scope.neighborhoodIds.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (!passenger.neighborhood_id || !scope.neighborhoodIds.includes(passenger.neighborhood_id)) {
        return res.status(403).json({ success: false, error: 'Passageiro fora do seu território' });
      }
    }

    // Masking para TERRITORIAL_OPERATOR
    const data: any = { ...passenger };
    if (admin.role === 'TERRITORIAL_OPERATOR') {
      if (data.document_cpf) data.document_cpf = '***' + data.document_cpf.slice(-4);
      data.password_hash = undefined;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching passenger:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar passageiro'
    });
  }
});

// PATCH /api/admin/passengers/:id
router.patch('/passengers/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, reason } = req.body;
    const ctx = auditCtx(req);

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'Motivo da alteração é obrigatório' });
    }

    const passenger = await prisma.passengers.findUnique({ where: { id } });
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    }

    const updates: any = {};
    const oldValues: any = {};
    const newValues: any = {};

    if (name !== undefined && name !== passenger.name) {
      if (!name.trim()) return res.status(400).json({ success: false, error: 'Nome não pode ser vazio' });
      oldValues.name = passenger.name;
      newValues.name = name.trim();
      updates.name = name.trim();
    }

    if (email !== undefined && email !== passenger.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Email em formato inválido' });
      }
      const existing = await prisma.passengers.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return res.status(409).json({ success: false, error: 'Email já cadastrado em outro passageiro' });
      }
      oldValues.email = passenger.email;
      newValues.email = email;
      updates.email = email;
    }

    if (phone !== undefined && phone !== passenger.phone) {
      if (phone && !/^\+?\d{10,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
        return res.status(400).json({ success: false, error: 'Telefone em formato inválido' });
      }
      if (phone) {
        const existingPhone = await prisma.passengers.findFirst({ where: { phone, id: { not: id } } });
        if (existingPhone) {
          return res.status(409).json({ success: false, error: 'Telefone já cadastrado em outro passageiro' });
        }
      }
      oldValues.phone = passenger.phone;
      newValues.phone = phone || null;
      updates.phone = phone || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma alteração detectada' });
    }

    updates.updated_at = new Date();
    const updated = await prisma.passengers.update({ where: { id }, data: updates });

    audit({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'update_passenger',
      entityType: 'passenger',
      entityId: id,
      oldValue: oldValues,
      newValue: newValues,
      reason: reason.trim(),
      ipAddress: ctx.ip,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating passenger:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar passageiro' });
  }
});

// GET /api/admin/rides - Using RideAdminController with filters
router.get('/rides', allowReadAccess, applyTerritoryScope, requireTerritoryScope, rideController.getRides);

// GET /api/admin/rides/:id - Using RideAdminController with territory scope check
router.get('/rides/:id', allowReadAccess, applyTerritoryScope, async (req, res) => {
  const admin = (req as any).admin;
  const scope = (req as any).territoryScope;

  // TERRITORIAL_OPERATOR: verificar que corrida pertence ao território
  if (admin.role === 'TERRITORIAL_OPERATOR') {
    if (!scope || scope.neighborhoodIds.length === 0) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    const ride = await prisma.rides_v2.findUnique({
      where: { id: req.params.id },
      select: { origin_neighborhood_id: true },
    });
    if (!ride || !ride.origin_neighborhood_id || !scope.neighborhoodIds.includes(ride.origin_neighborhood_id)) {
      return res.status(403).json({ success: false, error: 'Corrida fora do seu território' });
    }
  }

  // Delegar ao controller
  return rideController.getRideById(req, res);
});

// PATCH /api/admin/rides/:id/status
router.patch('/rides/:id/status', requireSuperAdmin, auditWrite('update_ride_status', 'ride'), rideController.updateRideStatus);

// POST /api/admin/rides/:id/cancel
router.post('/rides/:id/cancel', requireSuperAdmin, auditWrite('cancel_ride', 'ride'), rideController.cancelRide);

// POST /api/admin/rides/:id/force-complete
router.post('/rides/:id/force-complete', requireSuperAdmin, auditWrite('force_complete_ride', 'ride'), rideController.forceCompleteRide);

// GET /api/admin/rides/audit
router.get('/rides/audit', allowReadAccess, rideController.getAuditLogs);

// Virtual Fence Center Management (SUPER_ADMIN and OPERATOR only)
const requireOperatorOrSuperAdmin = requireRole(['SUPER_ADMIN', 'OPERATOR']);

// GET /api/admin/drivers/:driverId/virtual-fence-center
router.get('/drivers/:driverId/virtual-fence-center', allowReadAccess, getVirtualFenceCenter);

// PUT /api/admin/drivers/:driverId/virtual-fence-center
router.put('/drivers/:driverId/virtual-fence-center', requireOperatorOrSuperAdmin, auditWrite('update_virtual_fence', 'driver', req => req.params.driverId), updateVirtualFenceCenter);

// DELETE /api/admin/drivers/:driverId/virtual-fence-center
router.delete('/drivers/:driverId/virtual-fence-center', requireOperatorOrSuperAdmin, auditWrite('delete_virtual_fence', 'driver', req => req.params.driverId), deleteVirtualFenceCenter);

// Passenger Favorite Locations Management
// GET /api/admin/passengers/:passengerId/favorites
router.get('/passengers/:passengerId/favorites', allowReadAccess, applyTerritoryScope, async (req, res) => {
  const admin = (req as any).admin;
  const scope = (req as any).territoryScope;
  if (admin.role === 'TERRITORIAL_OPERATOR') {
    if (!scope || scope.neighborhoodIds.length === 0) return res.status(403).json({ success: false, error: 'Acesso negado' });
    const passenger = await prisma.passengers.findUnique({ where: { id: req.params.passengerId }, select: { neighborhood_id: true } });
    if (!passenger || !passenger.neighborhood_id || !scope.neighborhoodIds.includes(passenger.neighborhood_id)) {
      return res.status(403).json({ success: false, error: 'Passageiro fora do seu território' });
    }
  }
  return passengerFavoritesController.getFavorites(req, res);
});

// PUT /api/admin/passengers/:passengerId/favorites
router.put('/passengers/:passengerId/favorites', requireOperatorOrSuperAdmin, passengerFavoritesController.upsertFavorite);

// DELETE /api/admin/passengers/:passengerId/favorites/:favoriteId
router.delete('/passengers/:passengerId/favorites/:favoriteId', requireOperatorOrSuperAdmin, passengerFavoritesController.deleteFavorite);

// Driver Secondary Base Management
// GET /api/admin/drivers/:driverId/secondary-base
router.get('/drivers/:driverId/secondary-base', allowReadAccess, driverSecondaryBaseController.getSecondaryBase);

// PUT /api/admin/drivers/:driverId/secondary-base
router.put('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.updateSecondaryBase);

// DELETE /api/admin/drivers/:driverId/secondary-base
router.delete('/drivers/:driverId/secondary-base', requireOperatorOrSuperAdmin, driverSecondaryBaseController.deleteSecondaryBase);

// Feature Flags Management
// GET /api/admin/feature-flags/:key
router.get('/feature-flags/:key', allowReadAccess, featureFlagsController.getFeatureFlag);

// PUT /api/admin/feature-flags/:key
router.put('/feature-flags/:key', requireOperatorOrSuperAdmin, auditWrite('update_feature_flag', 'feature_flag', req => req.params.key), featureFlagsController.updateFeatureFlag);

// GET /api/admin/feature-flags/:key/allowlist
router.get('/feature-flags/:key/allowlist', allowReadAccess, featureFlagsController.getAllowlist);

// POST /api/admin/feature-flags/:key/allowlist
router.post('/feature-flags/:key/allowlist', requireOperatorOrSuperAdmin, auditWrite('add_to_allowlist', 'feature_flag', req => req.params.key), featureFlagsController.addToAllowlist);

// DELETE /api/admin/feature-flags/:key/allowlist/:passengerId
router.delete('/feature-flags/:key/allowlist/:passengerId', requireOperatorOrSuperAdmin, auditWrite('remove_from_allowlist', 'feature_flag', req => req.params.key), featureFlagsController.removeFromAllowlist);

// Beta Monitor routes
const betaMonitor = new betaMonitorController.BetaMonitorController();

// GET /api/admin/beta-monitor/:featureKey/checkpoints
router.get('/beta-monitor/:featureKey/checkpoints', allowReadAccess, betaMonitor.getCheckpoints.bind(betaMonitor));

// GET /api/admin/beta-monitor/:featureKey/checkpoints/:id
router.get('/beta-monitor/:featureKey/checkpoints/:id', allowReadAccess, betaMonitor.getCheckpointDetail.bind(betaMonitor));

// POST /api/admin/beta-monitor/:featureKey/run
router.post('/beta-monitor/:featureKey/run', requireOperatorOrSuperAdmin, betaMonitor.runCheckpoint.bind(betaMonitor));

// GET /api/admin/runbooks/:key
router.get('/runbooks/:key', allowReadAccess, betaMonitor.getRunbook.bind(betaMonitor));

export { router as adminRoutes };
