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
           AND status = 'active'
         ORDER BY floor_price DESC
         LIMIT 1`,
        [originNeighborhoodId, destNeighborhoodId]
      );

      if (exact.rows[0]) {
        return toFloorResult(exact.rows[0]);
      }
    }

    // Prioridade 2: Desabilitado — fallback genérico (dest IS NULL) causava aplicação
    // incorreta do piso mais caro quando dest_neighborhood_id não estava preenchido.
    // Pisos devem ter dest_neighborhood_id preenchido para match exato.

    // Prioridade 3: Piso genérico por territory (qualquer corrida com origem neste território)
    // Usado para pisos urbanos mínimos por cidade/região (ex: Tambaú R$20).
    const generic = await pool.query(
      `SELECT tpf.id, tpf.territory_id, tpf.origin_label, tpf.dest_label,
              tpf.floor_price, tpf.surcharge, tpf.notes
       FROM territory_price_floors tpf
       JOIN neighborhoods n ON n.territory_id = tpf.territory_id
       WHERE n.id = $1
         AND tpf.origin_neighborhood_id IS NULL
         AND tpf.dest_neighborhood_id IS NULL
         AND tpf.is_active = true
         AND tpf.status = 'active'
       ORDER BY tpf.floor_price DESC
       LIMIT 1`,
      [originNeighborhoodId]
    );
    if (generic.rows[0]) {
      return toFloorResult(generic.rows[0]);
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
         AND status = 'active'
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
         AND status = 'active'
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
