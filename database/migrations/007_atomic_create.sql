-- =====================================================
-- STORED PROCEDURE: CRIAÇÃO ATÔMICA DEFINITIVA
-- =====================================================

CREATE OR REPLACE FUNCTION atomic_create_ride(
  passenger_uuid UUID,
  pickup_location_param TEXT,
  destination_location_param TEXT,
  service_type_param service_type_enum DEFAULT 'STANDARD_RIDE',
  allow_external_drivers_param BOOLEAN DEFAULT false,
  base_amount_param DECIMAL(10,2) DEFAULT NULL,
  additional_fee_param DECIMAL(10,2) DEFAULT 0.00,
  service_notes_param TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  new_ride RECORD;
  passenger_community RECORD;
  community_active_count INTEGER;
  eligible_drivers_count INTEGER;
  total_amount_calculated DECIMAL(10,2);
  config_fee DECIMAL(10,2);
BEGIN
  BEGIN
    -- Validar enum explicitamente (sem SQL dinâmico)
    IF service_type_param NOT IN ('STANDARD_RIDE', 'COMMUNITY_RIDE', 'TOUR_GUIDE', 'ELDERLY_ASSISTANCE', 'SPECIAL_ASSISTANCE', 'COMMUNITY_SERVICE') THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Tipo de serviço inválido'
      );
    END IF;
    
    -- Validar parâmetros obrigatórios
    IF passenger_uuid IS NULL OR 
       pickup_location_param IS NULL OR 
       destination_location_param IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Campos obrigatórios: passenger_id, pickup_location, destination_location'
      );
    END IF;
    
    -- Validar formato de destino e origem
    IF LENGTH(TRIM(pickup_location_param)) < 3 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Origem deve ter pelo menos 3 caracteres'
      );
    END IF;
    
    IF LENGTH(TRIM(destination_location_param)) < 3 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Destino deve ter pelo menos 3 caracteres'
      );
    END IF;
    
    -- ORDEM FIXA DE LOCKS (communities → passengers → drivers)
    -- 1. Buscar e lock comunidade do passageiro DENTRO DA TRANSAÇÃO
    SELECT 
      c.id, c.name, c.is_active
    INTO passenger_community
    FROM passengers p
    JOIN communities c ON p.community_id = c.id
    WHERE p.user_id = passenger_uuid
    FOR UPDATE OF c; -- Lock na comunidade
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Passageiro não possui comunidade associada'
      );
    END IF;
    
    -- 2. Verificar se comunidade está ativa DENTRO DA TRANSAÇÃO
    SELECT COUNT(*) INTO community_active_count
    FROM drivers d
    WHERE d.community_id = passenger_community.id 
      AND d.is_active = true;
    
    IF community_active_count < 3 AND NOT allow_external_drivers_param THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Comunidade não está ativa. Considere permitir motoristas externos.',
        'community_id', passenger_community.id,
        'community_name', passenger_community.name,
        'active_drivers', community_active_count
      );
    END IF;
    
    -- 3. Para serviços especiais, verificar motoristas habilitados DENTRO DA TRANSAÇÃO
    IF service_type_param NOT IN ('STANDARD_RIDE', 'COMMUNITY_RIDE') THEN
      SELECT COUNT(*) INTO eligible_drivers_count
      FROM drivers d
      WHERE d.community_id = passenger_community.id 
        AND d.is_active = true
        AND d.is_available = true
        AND (
          (service_type_param = 'TOUR_GUIDE' AND d.can_tour_guide = true) OR
          (service_type_param = 'ELDERLY_ASSISTANCE' AND d.can_elderly_assistance = true) OR
          (service_type_param = 'SPECIAL_ASSISTANCE' AND d.can_special_assistance = true) OR
          (service_type_param = 'COMMUNITY_SERVICE' AND d.can_community_service = true)
        );
      
      IF eligible_drivers_count = 0 AND NOT allow_external_drivers_param THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Não há motoristas habilitados para ' || service_type_param || ' na sua comunidade',
          'eligible_drivers', eligible_drivers_count
        );
      END IF;
    END IF;
    
    -- 4. Calcular valor total DENTRO DA TRANSAÇÃO
    SELECT base_additional_fee INTO config_fee
    FROM special_service_configs
    WHERE service_type = service_type_param AND is_active = true;
    
    total_amount_calculated := COALESCE(base_amount_param, 0) + 
                              COALESCE(additional_fee_param, config_fee, 0);
    
    -- 5. CRIAÇÃO ATÔMICA DA CORRIDA
    INSERT INTO rides (
      passenger_id,
      community_id,
      pickup_location,
      destination_location,
      service_type,
      allow_external_drivers,
      base_amount,
      additional_fee,
      total_amount,
      service_notes,
      status,
      created_at,
      updated_at
    ) VALUES (
      passenger_uuid,
      passenger_community.id,
      TRIM(pickup_location_param),
      TRIM(destination_location_param),
      service_type_param,
      allow_external_drivers_param,
      base_amount_param,
      COALESCE(additional_fee_param, 0.00),
      total_amount_calculated,
      service_notes_param,
      'pending',
      NOW(),
      NOW()
    ) RETURNING * INTO new_ride;
    
    -- 6. AUDITORIA NA MESMA TRANSAÇÃO
    INSERT INTO special_service_audit (
      ride_id,
      service_type,
      driver_id,
      driver_was_enabled,
      audit_notes
    ) VALUES (
      new_ride.id,
      new_ride.service_type,
      NULL,
      false,
      'Corrida criada via stored procedure atômica definitiva'
    );
    
    COMMIT;
    
    RETURN json_build_object(
      'success', true,
      'ride_id', new_ride.id,
      'status', new_ride.status,
      'community_id', new_ride.community_id,
      'service_type', new_ride.service_type,
      'total_amount', new_ride.total_amount,
      'created_at', new_ride.created_at
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'Erro ao criar corrida: ' || SQLERRM,
        'error_code', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql;
