import type { Request, Response, NextFunction } from 'express';
import { getAdminTerritoryScope, TerritoryScope } from '../services/territory-scope.service';

/**
 * Middleware que resolve o escopo territorial do admin logado.
 * Seta req.territoryScope para uso nos handlers.
 *
 * - SUPER_ADMIN → req.territoryScope = null (sem filtro)
 * - Admin sem territory_access → req.territoryScope = null (backward compatible)
 * - Admin com territory_access → req.territoryScope = { territoryIds, neighborhoodIds, accessLevel }
 *
 * Este middleware NÃO bloqueia acesso. Apenas resolve o escopo.
 * Cada handler decide como usar req.territoryScope.
 */
export async function applyTerritoryScope(req: Request, _res: Response, next: NextFunction) {
  try {
    const admin = (req as any).admin;
    if (!admin) return next();

    const scope = await getAdminTerritoryScope(admin.id, admin.role);
    (req as any).territoryScope = scope;
    next();
  } catch (err) {
    // Fail-open: se resolver falhar, não bloqueia (SUPER_ADMIN behavior)
    (req as any).territoryScope = null;
    next();
  }
}
