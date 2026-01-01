-- =====================================================
-- STORED PROCEDURE: ACEITE ATÔMICO DEFINITIVO
-- =====================================================

CREATE OR REPLACE FUNCTION atomic_accept_ride(
  ride_uuid UUID,
  driver_uuid UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
  updated_ride RECORD;
  driver_check RECORD;
  ride_check RECORD;
  community_check RECORD;
BEGIN
  -- TRANSAÇÃO EXPLÍCITA
  BEGIN
    -- ORDEM FIXA DE LOCKS (sempre: communities → rides → drivers)
    -- 1. Lock comunidade primeiro (menor granularidade)
    SELECT id, is_active INTO community_check
    FROM communities 
    WHERE id IN (
      SELECT community_id FROM rides WHERE id = ride_uuid
      UNION
      SELECT community_id FROM drivers WHERE id = driver_uuid
    )
    ORDER BY id -- Ordem determinística por ID
    FOR UPDATE;
    
    -- 2. Lock corrida (ordem por ID para evitar deadlock)
    SELECT 
      id, status, community_id, passenger_id, driver_id, allow_external_drivers
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
    IF ride_check.status != 'pending' THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida não está disponível para aceite'
      );
    END IF;
    
    -- 3. Lock motorista (último na hierarquia)
    SELECT 
      id, is_active, is_available, community_id
    INTO driver_check
    FROM drivers 
    WHERE id = driver_uuid
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Motorista não encontrado'
      );
    END IF;
    
    -- VALIDAÇÕES ATÔMICAS DENTRO DA TRANSAÇÃO
    IF NOT driver_check.is_active THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Motorista não está ativo'
      );
    END IF;
    
    IF NOT driver_check.is_available THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Motorista não está disponível'
      );
    END IF;
    
    -- Validar isolamento comunitário
    IF driver_check.community_id != ride_check.community_id THEN
      IF NOT ride_check.allow_external_drivers THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Motorista não pertence à comunidade da corrida'
        );
      END IF;
    END IF;
    
    -- Verificar se corrida já tem motorista
    IF ride_check.driver_id IS NOT NULL AND ride_check.driver_id != driver_uuid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida já foi atribuída a outro motorista'
      );
    END IF;
    
    -- UPDATES ATÔMICOS
    -- 1. Atualizar corrida
    UPDATE rides 
    SET 
      status = 'accepted',
      driver_id = driver_uuid,
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE 
      id = ride_uuid 
      AND status = 'pending'
    RETURNING * INTO updated_ride;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Corrida foi aceita por outro motorista'
      );
    END IF;
    
    -- 2. Marcar motorista como indisponível
    UPDATE drivers 
    SET 
      is_available = false,
      last_availability_change = NOW()
    WHERE id = driver_uuid;
    
    -- 3. AUDITORIA NA MESMA TRANSAÇÃO (obrigatória)
    INSERT INTO special_service_audit (
      ride_id,
      service_type,
      driver_id,
      driver_was_enabled,
      driver_accepted_at,
      audit_notes
    ) VALUES (
      updated_ride.id,
      updated_ride.service_type,
      driver_uuid,
      true,
      NOW(),
      'Corrida aceita via stored procedure atômica definitiva'
    );
    
    -- COMMIT EXPLÍCITO
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', updated_ride.id,
      'status', updated_ride.status,
      'accepted_at', updated_ride.accepted_at,
      'driver_id', updated_ride.driver_id,
      'community_id', updated_ride.community_id
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- ROLLBACK EXPLÍCITO
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao aceitar corrida: ' || SQLERRM,
        'error_code', SQLSTATE,
        'error_detail', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql;
