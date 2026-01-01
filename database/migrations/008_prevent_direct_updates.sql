-- =====================================================
-- PROIBIÇÃO DE UPDATE DIRETO EM RIDES
-- =====================================================

-- Criar função que bloqueia updates diretos em campos críticos
CREATE OR REPLACE FUNCTION prevent_direct_ride_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir apenas updates de campos não-críticos
  IF OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Updates de status devem usar stored procedures atômicas';
  END IF;
  
  IF OLD.driver_id IS DISTINCT FROM NEW.driver_id THEN
    -- Permitir apenas remoção de driver (recusa) ou se for via stored procedure
    IF NEW.driver_id IS NOT NULL AND OLD.driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Mudança de motorista deve usar stored procedures atômicas';
    END IF;
  END IF;
  
  -- Permitir update apenas se vier de stored procedure (detectar via application_name)
  IF current_setting('application_name', true) NOT LIKE '%supabase%' THEN
    -- Se não for do Supabase (stored procedure), bloquear mudanças críticas
    IF OLD.status != NEW.status OR 
       OLD.driver_id IS DISTINCT FROM NEW.driver_id OR
       OLD.accepted_at IS DISTINCT FROM NEW.accepted_at OR
       OLD.started_at IS DISTINCT FROM NEW.started_at OR
       OLD.completed_at IS DISTINCT FROM NEW.completed_at OR
       OLD.cancelled_at IS DISTINCT FROM NEW.cancelled_at THEN
      RAISE EXCEPTION 'Mudanças críticas devem usar stored procedures atômicas';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de proteção
CREATE TRIGGER trigger_prevent_direct_ride_updates
  BEFORE UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION prevent_direct_ride_updates();

-- Comentário
COMMENT ON FUNCTION prevent_direct_ride_updates() IS 'Impede updates diretos em campos críticos da tabela rides';
