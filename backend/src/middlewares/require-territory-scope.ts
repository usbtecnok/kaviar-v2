import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware guard que garante que TERRITORIAL_OPERATOR tenha escopo territorial válido.
 *
 * DEVE ser usado APÓS applyTerritoryScope.
 *
 * Comportamento:
 * - SUPER_ADMIN → passa sempre (acesso global)
 * - TERRITORIAL_OPERATOR sem scope ou com scope vazio → 403
 * - TERRITORIAL_OPERATOR com scope preenchido → passa
 * - Demais roles → passa (backward compatible, sem restrição territorial)
 */
export function requireTerritoryScope(req: Request, res: Response, next: NextFunction) {
  const admin = (req as any).admin;
  if (!admin) return res.status(401).json({ success: false, error: 'Não autenticado' });

  // SUPER_ADMIN: bypass incondicional
  if (admin.role === 'SUPER_ADMIN') return next();

  // TERRITORIAL_OPERATOR / TERRITORIAL_MANAGER: exige scope válido
  if (admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER') {
    const scope = (req as any).territoryScope;
    if (!scope || !scope.neighborhoodIds || scope.neighborhoodIds.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Sem território vinculado. Acesso negado.',
      });
    }
  }

  return next();
}
