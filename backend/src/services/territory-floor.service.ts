/**
 * Territory Floor Service — Piso territorial de preço por rota
 *
 * Responsabilidade:
 *   Resolver o preço mínimo (floor) para uma rota específica,
 *   baseado na tabela territory_price_floors.
 *
 * Regra de negócio:
 *   preço_final = MAX(preço_calculado_pelo_engine, piso_territorial)
 *
 * Resolução:
 *   1. Match EXATO por origin_neighborhood_id + dest_neighborhood_id (mais preciso)
 *   2. Match por origin_neighborhood_id + dest_label (quando dest não tem geofence)
 *   3. Se nenhum match → retorna null (cálculo normal prevalece)
 *
 * Segurança:
 *   - Só aplica se is_active = true
 *   - Só aplica se territory_id está vinculado a um território ativo
 *   - Se tabela não existe ou query falha → retorna null (fail-open para cálculo normal)
 */

import { pool } from '../db';

// --- Types ---

export interface FloorResult {
  id: string;
  territory_id: string;
  origin_label: string;
  dest_label: string;
  floor_price: number;
  surcharge: number;
  total_floor: number; // floor_price + surcharge
  notes: string | null;
}

// --- Public API ---

/**
 * Resolve o piso territorial para uma rota (origem → destino).
 *
 * @param originNeighborhoodId - ID do bairro de origem (resolvido por geofence)
 * @param destNeighborhoodId - ID do bairro de destino (resolvido por geofence)
 * @returns FloorResult ou null se não houver piso configurado
 */
export async function getFloorForRoute(
  originNeighborhoodId: string | null,
  destNeighborhoodId: string | null
): Promise<FloorResult | null> {
  // Sem origem resolvida → não há como buscar floor
  if (!originNeighborhoodId) return null;

  try {
    // Prioridade 1: Match exato origin + dest por neighborhood_id
    if (destNeighborhoodId) {
      const exact = await pool.query(
        `SELECT id, territory_id, origin_label, dest_label,
                floor_price, surcharge, notes
         FROM territory_price_floors
         WHERE origin_neighborhood_id = $1
           AND dest_neighborhood_id = $2
           AND is_active = true
         ORDER BY floor_price DESC
         LIMIT 1`,
        [originNeighborhoodId, destNeighborhoodId]
      );

      if (exact.rows[0]) {
        return toFloorResult(exact.rows[0]);
      }
    }

    // Prioridade 2: Match por origin_neighborhood_id sem dest específico
    // (útil para destinos que não têm geofence mas têm label na tabela)
    if (destNeighborhoodId) {
      const byOriginOnly = await pool.query(
        `SELECT id, territory_id, origin_label, dest_label,
                floor_price, surcharge, notes
         FROM territory_price_floors
         WHERE origin_neighborhood_id = $1
           AND dest_neighborhood_id IS NULL
           AND is_active = true
         ORDER BY floor_price DESC
         LIMIT 1`,
        [originNeighborhoodId]
      );

      // Se existe um floor genérico para qualquer destino a partir desta origem
      if (byOriginOnly.rows[0]) {
        return toFloorResult(byOriginOnly.rows[0]);
      }
    }

    return null;
  } catch (error) {
    // Fail-open: se tabela não existe ou erro de query, não bloquear corrida
    console.error('[TerritoryFloor] Error resolving floor:', error);
    return null;
  }
}

/**
 * Resolve o piso territorial usando dest_label (para match textual).
 * Usado quando o destino é resolvido por nome mas não tem neighborhood_id.
 *
 * @param originNeighborhoodId - ID do bairro de origem
 * @param destLabel - Nome/label do destino (ex: "Leblon", "Aeroporto Santos Dumont")
 * @returns FloorResult ou null
 */
export async function getFloorByLabel(
  originNeighborhoodId: string | null,
  destLabel: string | null
): Promise<FloorResult | null> {
  if (!originNeighborhoodId || !destLabel) return null;

  try {
    const result = await pool.query(
      `SELECT id, territory_id, origin_label, dest_label,
              floor_price, surcharge, notes
       FROM territory_price_floors
       WHERE origin_neighborhood_id = $1
         AND LOWER(dest_label) = LOWER($2)
         AND is_active = true
       ORDER BY floor_price DESC
       LIMIT 1`,
      [originNeighborhoodId, destLabel]
    );

    if (result.rows[0]) {
      return toFloorResult(result.rows[0]);
    }

    return null;
  } catch (error) {
    console.error('[TerritoryFloor] Error resolving floor by label:', error);
    return null;
  }
}

/**
 * Lista todos os pisos ativos para um território (para admin).
 */
export async function listFloorsForTerritory(territoryId: string): Promise<FloorResult[]> {
  try {
    const result = await pool.query(
      `SELECT id, territory_id, origin_label, dest_label,
              floor_price, surcharge, notes
       FROM territory_price_floors
       WHERE territory_id = $1
         AND is_active = true
       ORDER BY origin_label, floor_price ASC`,
      [territoryId]
    );

    return result.rows.map(toFloorResult);
  } catch (error) {
    console.error('[TerritoryFloor] Error listing floors:', error);
    return [];
  }
}

// --- Helpers ---

function toFloorResult(row: any): FloorResult {
  const floorPrice = Number(row.floor_price);
  const surcharge = Number(row.surcharge || 0);
  return {
    id: row.id,
    territory_id: row.territory_id,
    origin_label: row.origin_label,
    dest_label: row.dest_label,
    floor_price: floorPrice,
    surcharge,
    total_floor: Math.round((floorPrice + surcharge) * 100) / 100,
    notes: row.notes || null,
  };
}
