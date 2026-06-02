import { prisma } from '../lib/prisma';

/**
 * Territory Scope Service — Fase 1 (deny-by-default para TERRITORIAL_OPERATOR).
 *
 * REGRAS:
 * - SUPER_ADMIN → retorna null (acesso global, sem filtro)
 * - TERRITORIAL_OPERATOR sem territory_access → retorna scope VAZIO (vê nada)
 * - TERRITORIAL_OPERATOR com territory_access → retorna scope preenchido (vê só seu território)
 * - Demais roles sem territory_access → retorna null (backward compatible, acesso global)
 * - Demais roles com territory_access → retorna scope preenchido
 */

export interface TerritoryScope {
  territoryIds: string[];
  neighborhoodIds: string[];
  accessLevel: string;
}

/**
 * Resolve o escopo territorial de um admin.
 * Retorna null se o admin tem acesso global (SUPER_ADMIN ou role sem restrição configurada).
 * Retorna scope vazio para TERRITORIAL_OPERATOR sem vínculo (deny-by-default).
 */
export async function getAdminTerritoryScope(
  adminId: string,
  role: string
): Promise<TerritoryScope | null> {
  // SUPER_ADMIN: acesso global incondicional
  if (role === 'SUPER_ADMIN') return null;

  const access = await prisma.admin_territory_access.findMany({
    where: { admin_id: adminId },
    select: { territory_id: true, access_level: true },
  });

  // Sem registros de territory_access:
  if (access.length === 0) {
    // TERRITORIAL_OPERATOR sem vínculo → scope vazio (deny-by-default)
    if (role === 'TERRITORIAL_OPERATOR') {
      return { territoryIds: [], neighborhoodIds: [], accessLevel: 'none' };
    }
    // Demais roles → acesso global (backward compatible)
    return null;
  }

  const territoryIds = access.map((a) => a.territory_id);

  // Resolver neighborhood_ids vinculados aos territórios
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: { territory_id: { in: territoryIds } },
    select: { id: true },
  });

  return {
    territoryIds,
    neighborhoodIds: neighborhoods.map((n) => n.id),
    accessLevel: access[0].access_level,
  };
}
