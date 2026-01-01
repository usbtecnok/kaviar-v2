-- =====================================================
-- STORED PROCEDURE: RECUSA ATÔMICA DEFINITIVA
-- =====================================================

CREATE OR REPLACE FUNCTION atomic_decline_ride(
  ride_uuid UUID,
  driver_uuid UUID,
  decline_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
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
      id, status, driver_id, service_notes
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
    
    -- Validar se corrida pode ser recusada
    IF ride_check.status NOT IN ('pending', 'accepted') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não pode ser recusada no estado atual'
      );
    END IF;
    
    -- Verificar se motorista pode recusar
    IF ride_check.driver_id IS NOT NULL AND ride_check.driver_id != driver_uuid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Você não pode recusar esta corrida'
      );
    END IF;
    
    -- 3. Lock motorista
    PERFORM 1 FROM drivers 
    WHERE id = driver_uuid
    FOR UPDATE;
    
    -- RECUSA ATÔMICA: Remove atribuição e adiciona nota
    UPDATE rides 
    SET 
      driver_id = NULL,
      service_notes = COALESCE(ride_check.service_notes, '') || 
                     CASE WHEN decline_reason IS NOT NULL 
                          THEN E'\nRecusada: ' || decline_reason 
                          ELSE E'\nRecusada pelo motorista' 
                     END,
      updated_at = NOW()
    WHERE 
      id = ride_uuid
      AND status IN ('pending', 'accepted')
    RETURNING * INTO updated_ride;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Falha ao recusar corrida'
      );
    END IF;
    
    -- Se motorista estava atribuído, marcar como disponível
    IF ride_check.driver_id = driver_uuid THEN
      UPDATE drivers 
      SET 
        is_available = true,
        last_availability_change = NOW()
      WHERE id = driver_uuid AND is_active = true;
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
      false,
      'Corrida recusada: ' || COALESCE(decline_reason, 'Sem motivo especificado')
    );
    
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', updated_ride.id,
      'status', updated_ride.status,
      'driver_id', updated_ride.driver_id,
      'decline_reason', decline_reason
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao recusar corrida: ' || SQLERRM,
        'error_code', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;
