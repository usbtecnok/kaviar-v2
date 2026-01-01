-- =====================================================
-- STORED PROCEDURES: FINALIZAÇÃO E CANCELAMENTO
-- =====================================================

-- Finalizar corrida atomicamente
CREATE OR REPLACE FUNCTION atomic_finish_ride(
  ride_uuid UUID,
  driver_uuid UUID,
  final_amount_param DECIMAL(10,2) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN
    -- ORDEM FIXA DE LOCKS (communities → rides → drivers)
    PERFORM 1 FROM communities 
    WHERE id IN (
      SELECT community_id FROM rides WHERE id = ride_uuid
      UNION
      SELECT community_id FROM drivers WHERE id = driver_uuid
    )
    ORDER BY id
    FOR UPDATE;
    
    -- Lock corrida
    SELECT 
      id, status, driver_id, total_amount
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
    IF ride_check.status != 'in_progress' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não está em progresso'
      );
    END IF;
    
    -- Verificar se é o motorista correto
    IF ride_check.driver_id != driver_uuid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Apenas o motorista responsável pode finalizar a corrida'
      );
    END IF;
    
    -- Lock motorista
    PERFORM 1 FROM drivers 
    WHERE id = driver_uuid
    FOR UPDATE;
    
    -- TRANSIÇÃO ATÔMICA: in_progress → completed
    UPDATE rides 
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW(),
      total_amount = COALESCE(final_amount_param, total_amount)
    WHERE 
      id = ride_uuid 
      AND status = 'in_progress'
      AND driver_id = driver_uuid
    RETURNING * INTO updated_ride;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Falha na finalização da corrida'
      );
    END IF;
    
    -- Marcar motorista como disponível novamente
    UPDATE drivers 
    SET 
      is_available = true,
      last_availability_change = NOW()
    WHERE id = driver_uuid AND is_active = true;
    
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
      'Corrida finalizada via stored procedure atômica definitiva'
    );
    
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', updated_ride.id,
      'status', updated_ride.status,
      'completed_at', updated_ride.completed_at,
      'total_amount', updated_ride.total_amount
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao finalizar corrida: ' || SQLERRM,
        'error_code', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- Cancelar corrida atomicamente
CREATE OR REPLACE FUNCTION atomic_cancel_ride(
  ride_uuid UUID,
  user_uuid UUID,
  cancellation_reason_param TEXT
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN
    -- ORDEM FIXA DE LOCKS (communities → rides → drivers)
    PERFORM 1 FROM communities 
    WHERE id IN (
      SELECT community_id FROM rides WHERE id = ride_uuid
      UNION
      SELECT community_id FROM drivers WHERE driver_id = (SELECT driver_id FROM rides WHERE id = ride_uuid)
    )
    ORDER BY id
    FOR UPDATE;
    
    -- Lock corrida
    SELECT 
      id, status, driver_id, passenger_id
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
    
    -- Validar se corrida pode ser cancelada
    IF ride_check.status NOT IN ('pending', 'accepted') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não pode ser cancelada no estado atual'
      );
    END IF;
    
    -- Verificar permissão (motorista ou passageiro)
    IF ride_check.driver_id != user_uuid AND ride_check.passenger_id != user_uuid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Apenas o motorista ou passageiro podem cancelar a corrida'
      );
    END IF;
    
    -- Lock motorista se existir
    IF ride_check.driver_id IS NOT NULL THEN
      PERFORM 1 FROM drivers 
      WHERE id = ride_check.driver_id
      FOR UPDATE;
    END IF;
    
    -- TRANSIÇÃO ATÔMICA: pending/accepted → cancelled
    UPDATE rides 
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW(),
      cancellation_reason = cancellation_reason_param
    WHERE 
      id = ride_uuid 
      AND status IN ('pending', 'accepted')
    RETURNING * INTO updated_ride;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Falha no cancelamento da corrida'
      );
    END IF;
    
    -- Se havia motorista, marcar como disponível
    IF updated_ride.driver_id IS NOT NULL THEN
      UPDATE drivers 
      SET 
        is_available = true,
        last_availability_change = NOW()
      WHERE id = updated_ride.driver_id AND is_active = true;
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
      updated_ride.driver_id,
      CASE WHEN updated_ride.driver_id IS NOT NULL THEN true ELSE false END,
      'Corrida cancelada: ' || cancellation_reason_param
    );
    
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', updated_ride.id,
      'status', updated_ride.status,
      'cancelled_at', updated_ride.cancelled_at,
      'cancellation_reason', updated_ride.cancellation_reason
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao cancelar corrida: ' || SQLERRM,
        'error_code', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;
