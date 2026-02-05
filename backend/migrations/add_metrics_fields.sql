-- Migration: Adicionar campos críticos para métricas
-- Data: 2026-02-05
-- Região: us-east-2

-- 1. Adicionar campos em rides
ALTER TABLE rides ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS match_type VARCHAR(50);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS dropoff_neighborhood_id VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- 2. Adicionar ride_id em match_logs
ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS ride_id VARCHAR(255);

-- 3. Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_rides_driver_created ON rides(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_neighborhood ON rides(pickup_neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_driver_created ON match_logs(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_logs_ride ON match_logs(ride_id);

-- 4. Adicionar foreign keys
ALTER TABLE rides 
  ADD CONSTRAINT IF NOT EXISTS fk_rides_pickup_neighborhood 
  FOREIGN KEY (pickup_neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

ALTER TABLE rides 
  ADD CONSTRAINT IF NOT EXISTS fk_rides_dropoff_neighborhood 
  FOREIGN KEY (dropoff_neighborhood_id) REFERENCES neighborhoods(id) ON DELETE SET NULL;

ALTER TABLE match_logs 
  ADD CONSTRAINT IF NOT EXISTS fk_match_logs_ride 
  FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL;

-- 5. Comentários para documentação
COMMENT ON COLUMN rides.platform_fee_percentage IS 'Percentual da taxa cobrada (7%, 12%, 20%)';
COMMENT ON COLUMN rides.match_type IS 'Tipo de match: SAME_NEIGHBORHOOD, ADJACENT_NEIGHBORHOOD, OUTSIDE_FENCE';
COMMENT ON COLUMN rides.pickup_neighborhood_id IS 'Bairro de origem da corrida';
COMMENT ON COLUMN rides.dropoff_neighborhood_id IS 'Bairro de destino da corrida';
COMMENT ON COLUMN match_logs.ride_id IS 'Link para a corrida (rides.id)';
