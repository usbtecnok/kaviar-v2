-- =====================================================
-- STORED PROCEDURE: INÍCIO ATÔMICO DEFINITIVO
-- =====================================================

CREATE OR REPLACE FUNCTION atomic_start_ride(
  ride_uuid UUID,
  driver_uuid UUID
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  driver_check RECORD;
  ride_check RECORD;
BEGIN
  BEGIN
    -- ORDEM FIXA DE LOCKS (communities → rides → drivers)
    -- 1. Lock comunidades envolvidas
    PERFORM 1 FROM communities 
    WHERE id IN (
      SELECT community_id FROM rides WHERE id = ride_uuid
      UNION
      SELECT community_id FROM drivers WHERE id = driver_uuid
    )
    ORDER BY id
    FOR UPDATE;
    
    -- 2. Lock corrida
    SELECT 
      id, status, driver_id, community_id, allow_external_drivers
    INTO ride_check
    FROM rides 
    WHERE id = ride_uuid
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não encontrada'
      );
    END IF;
    
    -- Validar status dentro da transação
    IF ride_check.status != 'accepted' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não está aceita'
      );
    END IF;
    
    -- Verificar se é o motorista correto
    IF ride_check.driver_id != driver_uuid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Você não é o motorista responsável por esta corrida'
      );
    END IF;
    
    -- 3. Lock motorista
    SELECT 
      id, is_active, community_id
    INTO driver_check
    FROM drivers 
    WHERE id = driver_uuid
    FOR UPDATE;
    
    IF NOT FOUND OR NOT driver_check.is_active THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Motorista não encontrado ou inativo'
      );
    END IF;
    
    -- Validar comunidade dentro da transação
    IF driver_check.community_id != ride_check.community_id THEN
      IF NOT ride_check.allow_external_drivers THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Violação de isolamento comunitário'
        );
      END IF;
    END IF;
    
    -- TRANSIÇÃO ATÔMICA: accepted → in_progress
    UPDATE rides 
    SET 
      status = 'in_progress',
      started_at = NOW(),
      updated_at = NOW()
    WHERE 
      id = ride_uuid 
      AND status = 'accepted'
      AND driver_id = driver_uuid
    RETURNING * INTO updated_ride;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Falha na transição de estado'
      );
    END IF;
    
    -- AUDITORIA NA MESMA TRANSAÇÃO
    INSERT INTO special_service_audit (
      ride_id,
      service_type,
      driver_id,
      driver_was_enabled,
      audit_notes
    ) VALUES (
      updated_ride.id,
      updated_ride.service_type,
      driver_uuid,
      true,
      'Corrida iniciada via stored procedure atômica definitiva'
    );
    
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', updated_ride.id,
      'status', updated_ride.status,
      'started_at', updated_ride.started_at,
      'driver_id', updated_ride.driver_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao iniciar corrida: ' || SQLERRM,
        'error_code', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;
