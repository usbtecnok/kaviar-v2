import { prisma } from '../lib/prisma';

/**
 * Territory Scope Service — com resolução hierárquica (filhos + netos).
 *
 * REGRAS:
 * - SUPER_ADMIN → retorna null (acesso global, sem filtro)
 * - TERRITORIAL_OPERATOR sem territory_access → retorna scope VAZIO (vê nada)
 * - TERRITORIAL_OPERATOR com territory_access → retorna scope preenchido (território + filhos + netos)
 * - Demais roles sem territory_access → retorna null (backward compatible, acesso global)
 * - Demais roles com territory_access → retorna scope preenchido (com hierarquia)
 */

export interface TerritoryScope {
  territoryIds: string[];
  neighborhoodIds: string[];
  accessLevel: string;
}

/**
 * Resolve o escopo territorial de um admin, incluindo territórios filhos e netos.
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

  const directIds = access.map((a) => a.territory_id);

  // Resolver hierarquia: diretos + filhos + netos (max 2 níveis abaixo)
  const allTerritoryIds = await resolveWithChildren(directIds);

  // Resolver neighborhood_ids vinculados a todos os territórios da hierarquia
  const neighborhoods = await prisma.neighborhoods.findMany({
    where: { territory_id: { in: allTerritoryIds } },
    select: { id: true },
  });

  return {
    territoryIds: allTerritoryIds,
    neighborhoodIds: neighborhoods.map((n) => n.id),
    accessLevel: access[0].access_level,
  };
}

/**
 * Resolve IDs de territórios diretos + filhos + netos (2 níveis).
 * Hierarquia KAVIAR: country > state > city > region > operation (max 5 níveis total).
 */
async function resolveWithChildren(territoryIds: string[]): Promise<string[]> {
  const all = [...territoryIds];

  // Filhos (nível 1)
  const children = await prisma.operational_territories.findMany({
    where: { parent_id: { in: territoryIds }, is_active: true },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);
  all.push(...childIds);

  // Netos (nível 2)
  if (childIds.length > 0) {
    const grandchildren = await prisma.operational_territories.findMany({
      where: { parent_id: { in: childIds }, is_active: true },
      select: { id: true },
    });
    all.push(...grandchildren.map((g) => g.id));
  }

  return all;
}
