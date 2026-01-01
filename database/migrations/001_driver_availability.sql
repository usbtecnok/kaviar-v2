-- =====================================================
-- MIGRATION: ADICIONAR DISPONIBILIDADE DO MOTORISTA
-- =====================================================

-- Adicionar campo de disponibilidade na tabela drivers
ALTER TABLE drivers 
ADD COLUMN is_available BOOLEAN DEFAULT false,
ADD COLUMN last_availability_change TIMESTAMPTZ DEFAULT NOW();

-- Índice para consultas de motoristas disponíveis
CREATE INDEX idx_drivers_available ON drivers(is_available, community_id) WHERE is_available = true;

-- Comentários
COMMENT ON COLUMN drivers.is_available IS 'Status de disponibilidade do motorista para receber corridas';
COMMENT ON COLUMN drivers.last_availability_change IS 'Timestamp da última mudança de disponibilidade';
