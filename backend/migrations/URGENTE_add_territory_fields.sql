-- MIGRATION URGENTE: Adicionar campos de território
-- Execute IMEDIATAMENTE via Neon Console

-- Adicionar campos em drivers
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS territory_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS territory_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS territory_verification_method VARCHAR(20);

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_drivers_territory_type 
ON drivers(territory_type) 
WHERE territory_type IS NOT NULL;

-- Atualizar motoristas existentes
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
