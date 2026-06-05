-- =====================================================================
-- Migration 007: territory_price_floors
-- Tabela de pisos territoriais de preço por rota (origem → destino)
--
-- Regra de negócio:
--   preço_final = MAX(preço_calculado_pelo_engine, piso_territorial)
--
-- O floor só aplica quando houver match exato de:
--   territory_id + origin_label/neighborhood + dest_label/neighborhood
--
-- Se não houver match, cálculo atual permanece inalterado.
--
-- ROLLBACK: DROP TABLE territory_price_floors;
-- =====================================================================

CREATE TABLE IF NOT EXISTS territory_price_floors (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Governança territorial (quem gerencia este piso)
  territory_id            UUID NOT NULL,

  -- Compatibilidade com motor de pricing (opcional)
  pricing_profile_id      UUID REFERENCES pricing_profiles(id) ON DELETE SET NULL,

  -- Origem (de onde sai a corrida)
  origin_label            TEXT NOT NULL,                   -- Nome legível (ex: "Rocinha", "Vidigal")
  origin_neighborhood_id  TEXT,                            -- FK lógica para neighborhoods.id (match automático)

  -- Destino (para onde vai)
  dest_label              TEXT NOT NULL,                   -- Nome legível (ex: "Leblon", "Copacabana")
  dest_neighborhood_id    TEXT,                            -- FK lógica para neighborhoods.id (match automático)

  -- Preço piso
  floor_price             DECIMAL(8,2) NOT NULL,           -- Preço mínimo absoluto para esta rota
  surcharge               DECIMAL(8,2) NOT NULL DEFAULT 0, -- Acréscimo condicional (ex: +R$5 zona alta)

  -- Metadados
  notes                   TEXT,                            -- Observações (ex: "acima do Largo Santinho")
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_by              TEXT,                            -- admin_id que criou
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para lookup rápido no quote()
CREATE INDEX idx_tpf_territory_active
  ON territory_price_floors (territory_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_tpf_origin_dest
  ON territory_price_floors (origin_neighborhood_id, dest_neighborhood_id)
  WHERE is_active = true;

CREATE INDEX idx_tpf_origin_label
  ON territory_price_floors (territory_id, origin_label)
  WHERE is_active = true;

-- Constraint: floor_price deve ser positivo
ALTER TABLE territory_price_floors
  ADD CONSTRAINT chk_floor_price_positive CHECK (floor_price > 0);

-- Constraint: surcharge não negativo
ALTER TABLE territory_price_floors
  ADD CONSTRAINT chk_surcharge_non_negative CHECK (surcharge >= 0);
