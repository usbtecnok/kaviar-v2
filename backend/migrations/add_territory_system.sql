-- Migration: Sistema de Território Inteligente
-- Data: 2026-02-05
-- Descrição: Adiciona campos de território, badges e conquistas

-- ============================================
-- 1. ADICIONAR CAMPOS DE TERRITÓRIO EM DRIVERS
-- ============================================

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS territory_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS territory_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS territory_verification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS virtual_fence_center_lng DECIMAL(11, 8);

COMMENT ON COLUMN drivers.territory_type IS 'Tipo de território: OFFICIAL, FALLBACK_800M, MANUAL, NULL';
COMMENT ON COLUMN drivers.territory_verified_at IS 'Última verificação do território';
COMMENT ON COLUMN drivers.territory_verification_method IS 'Método: GPS_AUTO, MANUAL_SELECTION, ADMIN_OVERRIDE';
COMMENT ON COLUMN drivers.virtual_fence_center_lat IS 'Centro da cerca virtual (fallback 800m)';
COMMENT ON COLUMN drivers.virtual_fence_center_lng IS 'Centro da cerca virtual (fallback 800m)';

-- ============================================
-- 2. CRIAR TABELA DE BADGES (CONQUISTAS)
-- ============================================

CREATE TABLE IF NOT EXISTS driver_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  badge_code VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  progress INTEGER DEFAULT 100,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_driver_badge UNIQUE(driver_id, badge_code)
);

COMMENT ON TABLE driver_badges IS 'Badges/conquistas desbloqueadas pelos motoristas';
COMMENT ON COLUMN driver_badges.badge_code IS 'Código do badge: local_hero, territory_master, etc';
COMMENT ON COLUMN driver_badges.progress IS 'Progresso 0-100%';
COMMENT ON COLUMN driver_badges.metadata IS 'Dados adicionais do badge';

-- ============================================
-- 3. CRIAR TABELA DE ESTATÍSTICAS DE TERRITÓRIO
-- ============================================

CREATE TABLE IF NOT EXISTS driver_territory_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_trips INTEGER DEFAULT 0,
  inside_territory_trips INTEGER DEFAULT 0,
  adjacent_territory_trips INTEGER DEFAULT 0,
  outside_territory_trips INTEGER DEFAULT 0,
  avg_fee_percentage DECIMAL(5, 2),
  potential_savings_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_driver_period UNIQUE(driver_id, period_start, period_end)
);

COMMENT ON TABLE driver_territory_stats IS 'Estatísticas agregadas de território por período';
COMMENT ON COLUMN driver_territory_stats.inside_territory_trips IS 'Corridas dentro do território (7% ou 12%)';
COMMENT ON COLUMN driver_territory_stats.adjacent_territory_trips IS 'Corridas em bairros adjacentes (12%)';
COMMENT ON COLUMN driver_territory_stats.outside_territory_trips IS 'Corridas fora do território (20%)';
COMMENT ON COLUMN driver_territory_stats.potential_savings_cents IS 'Economia potencial em centavos';

-- ============================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_drivers_territory_type 
ON drivers(territory_type) 
WHERE territory_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_neighborhood_territory 
ON drivers(neighborhood_id, territory_type) 
WHERE neighborhood_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_driver_badges_driver 
ON driver_badges(driver_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_badges_code 
ON driver_badges(badge_code);

CREATE INDEX IF NOT EXISTS idx_territory_stats_driver_period 
ON driver_territory_stats(driver_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_territory_stats_period 
ON driver_territory_stats(period_start, period_end);

-- ============================================
-- 5. ATUALIZAR DRIVERS EXISTENTES
-- ============================================

-- Motoristas com neighborhood_id mas sem territory_type
-- Detectar automaticamente se o bairro tem geofence
UPDATE drivers d
SET 
  territory_type = CASE 
    WHEN EXISTS (
      SELECT 1 FROM neighborhood_geofences ng 
      WHERE ng.neighborhood_id = d.neighborhood_id
    ) THEN 'OFFICIAL'
    ELSE 'FALLBACK_800M'
  END,
  territory_verification_method = 'ADMIN_OVERRIDE',
  territory_verified_at = NOW()
WHERE 
  d.neighborhood_id IS NOT NULL 
  AND d.territory_type IS NULL;

-- ============================================
-- 6. FUNÇÃO PARA ATUALIZAR ESTATÍSTICAS
-- ============================================

CREATE OR REPLACE FUNCTION update_territory_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar estatísticas quando uma corrida é completada
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO driver_territory_stats (
      driver_id,
      period_start,
      period_end,
      total_trips,
      inside_territory_trips,
      adjacent_territory_trips,
      outside_territory_trips,
      avg_fee_percentage
    )
    VALUES (
      NEW.driver_id,
      DATE_TRUNC('week', NEW.completed_at),
      DATE_TRUNC('week', NEW.completed_at) + INTERVAL '6 days',
      1,
      CASE WHEN NEW.match_type IN ('SAME_NEIGHBORHOOD', 'FALLBACK_800M') THEN 1 ELSE 0 END,
      CASE WHEN NEW.match_type = 'ADJACENT_NEIGHBORHOOD' THEN 1 ELSE 0 END,
      CASE WHEN NEW.match_type = 'OUTSIDE_FENCE' THEN 1 ELSE 0 END,
      NEW.platform_fee_percentage
    )
    ON CONFLICT (driver_id, period_start, period_end)
    DO UPDATE SET
      total_trips = driver_territory_stats.total_trips + 1,
      inside_territory_trips = driver_territory_stats.inside_territory_trips + 
        CASE WHEN NEW.match_type IN ('SAME_NEIGHBORHOOD', 'FALLBACK_800M') THEN 1 ELSE 0 END,
      adjacent_territory_trips = driver_territory_stats.adjacent_territory_trips + 
        CASE WHEN NEW.match_type = 'ADJACENT_NEIGHBORHOOD' THEN 1 ELSE 0 END,
      outside_territory_trips = driver_territory_stats.outside_territory_trips + 
        CASE WHEN NEW.match_type = 'OUTSIDE_FENCE' THEN 1 ELSE 0 END,
      avg_fee_percentage = (
        (driver_territory_stats.avg_fee_percentage * driver_territory_stats.total_trips + NEW.platform_fee_percentage) / 
        (driver_territory_stats.total_trips + 1)
      ),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_territory_stats ON rides;
CREATE TRIGGER trigger_update_territory_stats
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION update_territory_stats();

-- ============================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration add_territory_system.sql concluída';
  RAISE NOTICE '📊 Campos adicionados em drivers: 5';
  RAISE NOTICE '📊 Tabelas criadas: 2 (driver_badges, driver_territory_stats)';
  RAISE NOTICE '📊 Índices criados: 6';
  RAISE NOTICE '📊 Triggers criados: 1';
  RAISE NOTICE '⚠️  Executar manualmente via Neon Console ou psql';
END $$;
