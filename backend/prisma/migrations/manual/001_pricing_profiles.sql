-- Pricing Profiles: parâmetros de pricing por região/operação
-- Cada cidade/operação tem seu perfil configurável

CREATE TABLE IF NOT EXISTS pricing_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,

  -- Fórmula base
  base_fare       DECIMAL(8,2) NOT NULL,
  per_km          DECIMAL(8,2) NOT NULL,
  per_minute      DECIMAL(8,2) NOT NULL,
  minimum_fare    DECIMAL(8,2) NOT NULL,

  -- Taxa plataforma por camada territorial
  fee_local       DECIMAL(5,2) NOT NULL DEFAULT 7,
  fee_adjacent    DECIMAL(5,2) NOT NULL DEFAULT 12,
  fee_external    DECIMAL(5,2) NOT NULL DEFAULT 20,

  -- Custo de crédito por camada territorial
  credit_cost_local    INT NOT NULL DEFAULT 1,
  credit_cost_external INT NOT NULL DEFAULT 2,

  -- Raio operacional
  max_dispatch_km DECIMAL(6,2) NOT NULL DEFAULT 12,

  -- Geometria de cobertura (para resolver qual perfil usar)
  center_lat      DECIMAL(10,8),
  center_lng      DECIMAL(11,8),
  radius_km       DECIMAL(8,2),

  is_default      BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_profiles_active ON pricing_profiles(is_active) WHERE is_active = true;
