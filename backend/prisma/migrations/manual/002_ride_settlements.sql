-- Ride Settlements: snapshot imutável da economia de cada corrida
-- Fonte de verdade. rides_v2 é cache operacional.

CREATE TABLE IF NOT EXISTS ride_settlements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id                 TEXT UNIQUE NOT NULL,

  -- Perfil usado (snapshot)
  pricing_profile_id      UUID NOT NULL REFERENCES pricing_profiles(id),
  pricing_profile_slug    TEXT NOT NULL,

  -- Território resolvido
  origin_neighborhood_id  TEXT,
  origin_neighborhood     TEXT,
  dest_neighborhood_id    TEXT,
  dest_neighborhood       TEXT,
  driver_neighborhood_id  TEXT,
  driver_neighborhood     TEXT,

  -- Classificação territorial (sem ambiguidade)
  route_territory         TEXT NOT NULL,      -- 'local','adjacent','external' — rota sem motorista
  driver_territory        TEXT,               -- 'local','adjacent','external' — com motorista (preenchido no refine)
  settlement_territory    TEXT,               -- 'local','adjacent','external' — usado para fee/crédito final (preenchido no settle)

  -- Inputs
  distance_km             DECIMAL(8,2) NOT NULL,
  duration_min            DECIMAL(8,2),

  -- Parâmetros snapshot (imutável — o que foi usado)
  base_fare_used          DECIMAL(8,2) NOT NULL,
  per_km_used             DECIMAL(8,2) NOT NULL,
  per_minute_used         DECIMAL(8,2) NOT NULL,
  minimum_fare_used       DECIMAL(8,2) NOT NULL,

  -- Preços (ciclo de vida)
  quoted_price            DECIMAL(8,2) NOT NULL,
  locked_price            DECIMAL(8,2) NOT NULL,
  final_price             DECIMAL(8,2),

  -- Taxa e ganho (refinados no accept, fechados no settle)
  fee_percent             DECIMAL(5,2) NOT NULL,
  fee_amount              DECIMAL(8,2) NOT NULL,
  driver_earnings         DECIMAL(8,2) NOT NULL,

  -- Crédito
  credit_cost             INT,
  credit_match_type       TEXT,

  -- Timestamps
  quoted_at               TIMESTAMPTZ NOT NULL,
  locked_at               TIMESTAMPTZ,
  refined_at              TIMESTAMPTZ,
  settled_at              TIMESTAMPTZ,

  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ride_settlements_ride ON ride_settlements(ride_id);
CREATE INDEX idx_ride_settlements_profile ON ride_settlements(pricing_profile_id);
CREATE INDEX idx_ride_settlements_settled ON ride_settlements(settled_at) WHERE settled_at IS NOT NULL;
