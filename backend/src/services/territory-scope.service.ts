import { prisma } from '../lib/prisma';

/**
 * Territory Scope Service — preparação para Fase 2B (permissões regionais).
 *
 * REGRAS ATUAIS (Fase 2A):
 * - Este service NÃO é chamado por nenhum middleware ou endpoint.
 * - Existe apenas como preparação para uso futuro.
 * - SUPER_ADMIN sempre retorna null (acesso global, sem filtro).
 * - Admin sem registros em admin_territory_access retorna null (acesso global).
 *
 * REGRAS FUTURAS (Fase 2B — quando implementada):
 * - Admins regionais SEM territory_access configurado NÃO devem ganhar acesso
 *   global automaticamente. Devem receber 403 ou ver apenas dados sem território.
 * - Apenas SUPER_ADMIN tem bypass incondicional.
 * - O middleware applyTerritoryScope usará este helper para injetar filtros.
 */

export interface TerritoryScope {
  territoryIds: string[];
  neighborhoodIds: string[];
  accessLevel: string;
}

/**
 * Resolve o escopo territorial de um admin.
 * Retorna null se o admin tem acesso global (SUPER_ADMIN ou sem restrição configurada).
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

  // Sem registros = acesso global (backward compatible na Fase 2A)
  // NOTA FASE 2B: mudar para retornar escopo vazio (bloquear) em vez de null
  if (access.length === 0) return null;

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
