-- =====================================================
-- MIGRATION: SISTEMA DE ESTADOS DE CORRIDA
-- =====================================================

-- Criar enum para estados de corrida
CREATE TYPE ride_status_enum AS ENUM (
  'pending',
  'accepted', 
  'in_progress',
  'completed',
  'cancelled'
);

-- Adicionar campos de estado na tabela rides
ALTER TABLE rides 
ADD COLUMN status ride_status_enum DEFAULT 'pending' NOT NULL,
ADD COLUMN accepted_at TIMESTAMPTZ,
ADD COLUMN started_at TIMESTAMPTZ,
ADD COLUMN completed_at TIMESTAMPTZ,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN cancellation_reason TEXT;

-- Índices para performance
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_status_driver ON rides(driver_id, status);
CREATE INDEX idx_rides_status_passenger ON rides(passenger_id, status);

-- Função para validar transições de estado
CREATE OR REPLACE FUNCTION validate_ride_status_transition(
  old_status ride_status_enum,
  new_status ride_status_enum
) RETURNS BOOLEAN AS $$
BEGIN
  -- Transições válidas
  CASE old_status
    WHEN 'pending' THEN
      RETURN new_status IN ('accepted', 'cancelled');
    WHEN 'accepted' THEN
      RETURN new_status IN ('in_progress', 'cancelled');
    WHEN 'in_progress' THEN
      RETURN new_status IN ('completed', 'cancelled');
    WHEN 'completed', 'cancelled' THEN
      RETURN false; -- Estados finais
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar transições
CREATE OR REPLACE FUNCTION check_ride_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir inserção (sempre pending)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Validar transição em updates
  IF OLD.status != NEW.status THEN
    IF NOT validate_ride_status_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Transição inválida de % para %', OLD.status, NEW.status;
    END IF;
    
    -- Atualizar timestamps conforme novo status
    CASE NEW.status
      WHEN 'accepted' THEN
        NEW.accepted_at = NOW();
      WHEN 'in_progress' THEN
        NEW.started_at = NOW();
      WHEN 'completed' THEN
        NEW.completed_at = NOW();
      WHEN 'cancelled' THEN
        NEW.cancelled_at = NOW();
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ride_status_validation
  BEFORE INSERT OR UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION check_ride_status_transition();

-- Comentários
COMMENT ON COLUMN rides.status IS 'Estado atual da corrida';
COMMENT ON COLUMN rides.accepted_at IS 'Timestamp quando motorista aceitou';
COMMENT ON COLUMN rides.started_at IS 'Timestamp quando corrida iniciou';
COMMENT ON COLUMN rides.completed_at IS 'Timestamp quando corrida foi finalizada';
COMMENT ON COLUMN rides.cancelled_at IS 'Timestamp quando corrida foi cancelada';
COMMENT ON COLUMN rides.cancellation_reason IS 'Motivo do cancelamento';
