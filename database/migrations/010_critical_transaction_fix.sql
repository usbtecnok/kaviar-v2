-- =====================================================
-- CORREÇÃO CRÍTICA: TRANSAÇÕES EXPLÍCITAS OBRIGATÓRIAS
-- =====================================================

-- 1. ATOMIC_ACCEPT_RIDE com transação explícita
CREATE OR REPLACE FUNCTION atomic_accept_ride(
  ride_uuid UUID,
  driver_uuid UUID
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  driver_check RECORD;
  ride_check RECORD;
BEGIN
  -- TRANSAÇÃO EXPLÍCITA OBRIGATÓRIA
  BEGIN TRANSACTION;
  
  -- Ordem fixa de locks: communities → rides → drivers
  PERFORM 1 FROM communities 
  WHERE id IN (
    SELECT community_id FROM rides WHERE id = ride_uuid
    UNION
    SELECT community_id FROM drivers WHERE id = driver_uuid
  )
  ORDER BY id FOR UPDATE;
  
  -- Lock corrida
  SELECT id, status, community_id, driver_id, allow_external_drivers
  INTO ride_check FROM rides WHERE id = ride_uuid FOR UPDATE;
  
  IF NOT FOUND OR ride_check.status != 'pending' THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Corrida não disponível');
  END IF;
  
  -- Lock motorista
  SELECT id, is_active, is_available, community_id
  INTO driver_check FROM drivers WHERE id = driver_uuid FOR UPDATE;
  
  IF NOT FOUND OR NOT driver_check.is_active OR NOT driver_check.is_available THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Motorista inválido');
  END IF;
  
  -- Validar comunidade
  IF driver_check.community_id != ride_check.community_id AND NOT ride_check.allow_external_drivers THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Comunidade inválida');
  END IF;
  
  -- Update atômico
  UPDATE rides SET status = 'accepted', driver_id = driver_uuid, accepted_at = NOW()
  WHERE id = ride_uuid AND status = 'pending' RETURNING * INTO updated_ride;
  
  IF NOT FOUND THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Aceite falhou');
  END IF;
  
  UPDATE drivers SET is_available = false WHERE id = driver_uuid;
  
  -- AUDITORIA OBRIGATÓRIA - falha cancela tudo
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (updated_ride.id, updated_ride.service_type, driver_uuid, true, 'Aceite atômico');
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', updated_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- 2. ATOMIC_START_RIDE com transação explícita
CREATE OR REPLACE FUNCTION atomic_start_ride(
  ride_uuid UUID,
  driver_uuid UUID
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN TRANSACTION;
  
  -- Ordem fixa de locks
  PERFORM 1 FROM communities WHERE id IN (
    SELECT community_id FROM rides WHERE id = ride_uuid
  ) ORDER BY id FOR UPDATE;
  
  SELECT id, status, driver_id INTO ride_check 
  FROM rides WHERE id = ride_uuid FOR UPDATE;
  
  IF NOT FOUND OR ride_check.status != 'accepted' OR ride_check.driver_id != driver_uuid THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Início inválido');
  END IF;
  
  PERFORM 1 FROM drivers WHERE id = driver_uuid AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Motorista inativo');
  END IF;
  
  UPDATE rides SET status = 'in_progress', started_at = NOW()
  WHERE id = ride_uuid RETURNING * INTO updated_ride;
  
  -- AUDITORIA OBRIGATÓRIA
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (updated_ride.id, updated_ride.service_type, driver_uuid, true, 'Início atômico');
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', updated_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- 3. ATOMIC_FINISH_RIDE com transação explícita
CREATE OR REPLACE FUNCTION atomic_finish_ride(
  ride_uuid UUID,
  driver_uuid UUID,
  final_amount_param DECIMAL(10,2) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN TRANSACTION;
  
  -- Ordem fixa de locks
  PERFORM 1 FROM communities WHERE id IN (
    SELECT community_id FROM rides WHERE id = ride_uuid
  ) ORDER BY id FOR UPDATE;
  
  SELECT id, status, driver_id INTO ride_check 
  FROM rides WHERE id = ride_uuid FOR UPDATE;
  
  IF NOT FOUND OR ride_check.status != 'in_progress' OR ride_check.driver_id != driver_uuid THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Finalização inválida');
  END IF;
  
  PERFORM 1 FROM drivers WHERE id = driver_uuid FOR UPDATE;
  
  UPDATE rides SET status = 'completed', completed_at = NOW(),
    total_amount = COALESCE(final_amount_param, total_amount)
  WHERE id = ride_uuid RETURNING * INTO updated_ride;
  
  UPDATE drivers SET is_available = true WHERE id = driver_uuid AND is_active = true;
  
  -- AUDITORIA OBRIGATÓRIA
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (updated_ride.id, updated_ride.service_type, driver_uuid, true, 'Finalização atômica');
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', updated_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- 4. ATOMIC_CANCEL_RIDE com transação explícita
CREATE OR REPLACE FUNCTION atomic_cancel_ride(
  ride_uuid UUID,
  user_uuid UUID,
  cancellation_reason_param TEXT
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN TRANSACTION;
  
  -- Ordem fixa de locks
  PERFORM 1 FROM communities WHERE id IN (
    SELECT community_id FROM rides WHERE id = ride_uuid
  ) ORDER BY id FOR UPDATE;
  
  SELECT id, status, driver_id, passenger_id INTO ride_check 
  FROM rides WHERE id = ride_uuid FOR UPDATE;
  
  IF NOT FOUND OR ride_check.status NOT IN ('pending', 'accepted') THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Cancelamento inválido');
  END IF;
  
  IF ride_check.driver_id != user_uuid AND ride_check.passenger_id != user_uuid THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  -- Lock motorista se existir
  IF ride_check.driver_id IS NOT NULL THEN
    PERFORM 1 FROM drivers WHERE id = ride_check.driver_id FOR UPDATE;
  END IF;
  
  UPDATE rides SET status = 'cancelled', cancelled_at = NOW(), 
    cancellation_reason = cancellation_reason_param
  WHERE id = ride_uuid RETURNING * INTO updated_ride;
  
  -- Liberar motorista se havia
  IF updated_ride.driver_id IS NOT NULL THEN
    UPDATE drivers SET is_available = true 
    WHERE id = updated_ride.driver_id AND is_active = true;
  END IF;
  
  -- AUDITORIA OBRIGATÓRIA
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (updated_ride.id, updated_ride.service_type, updated_ride.driver_id, 
          CASE WHEN updated_ride.driver_id IS NOT NULL THEN true ELSE false END,
          'Cancelamento: ' || cancellation_reason_param);
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', updated_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- 5. ATOMIC_DECLINE_RIDE com transação explícita
CREATE OR REPLACE FUNCTION atomic_decline_ride(
  ride_uuid UUID,
  driver_uuid UUID,
  decline_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  updated_ride RECORD;
  ride_check RECORD;
BEGIN
  BEGIN TRANSACTION;
  
  -- Ordem fixa de locks
  PERFORM 1 FROM communities WHERE id IN (
    SELECT community_id FROM rides WHERE id = ride_uuid
    UNION
    SELECT community_id FROM drivers WHERE id = driver_uuid
  ) ORDER BY id FOR UPDATE;
  
  SELECT id, status, driver_id INTO ride_check 
  FROM rides WHERE id = ride_uuid FOR UPDATE;
  
  IF NOT FOUND OR ride_check.status NOT IN ('pending', 'accepted') THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Recusa inválida');
  END IF;
  
  IF ride_check.driver_id IS NOT NULL AND ride_check.driver_id != driver_uuid THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Sem permissão para recusar');
  END IF;
  
  PERFORM 1 FROM drivers WHERE id = driver_uuid FOR UPDATE;
  
  UPDATE rides SET driver_id = NULL, 
    service_notes = COALESCE(service_notes, '') || E'\nRecusada: ' || COALESCE(decline_reason, 'Sem motivo')
  WHERE id = ride_uuid RETURNING * INTO updated_ride;
  
  -- Marcar motorista como disponível se estava atribuído
  IF ride_check.driver_id = driver_uuid THEN
    UPDATE drivers SET is_available = true WHERE id = driver_uuid AND is_active = true;
  END IF;
  
  -- AUDITORIA OBRIGATÓRIA
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (updated_ride.id, updated_ride.service_type, driver_uuid, false,
          'Recusa: ' || COALESCE(decline_reason, 'Sem motivo'));
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', updated_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- 6. ATOMIC_CREATE_RIDE com transação explícita e validação de enum
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
  total_amount_calculated DECIMAL(10,2);
  config_fee DECIMAL(10,2);
BEGIN
  BEGIN TRANSACTION;
  
  -- Validar enum explicitamente (incluindo NULL)
  IF service_type_param IS NULL OR 
     service_type_param NOT IN ('STANDARD_RIDE', 'COMMUNITY_RIDE', 'TOUR_GUIDE', 
                               'ELDERLY_ASSISTANCE', 'SPECIAL_ASSISTANCE', 'COMMUNITY_SERVICE') THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Tipo de serviço inválido');
  END IF;
  
  -- Validações básicas
  IF passenger_uuid IS NULL OR pickup_location_param IS NULL OR destination_location_param IS NULL THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Campos obrigatórios ausentes');
  END IF;
  
  IF LENGTH(TRIM(pickup_location_param)) < 3 OR LENGTH(TRIM(destination_location_param)) < 3 THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Origem/destino muito curtos');
  END IF;
  
  -- Lock e buscar comunidade do passageiro
  SELECT c.id, c.name INTO passenger_community
  FROM passengers p JOIN communities c ON p.community_id = c.id
  WHERE p.user_id = passenger_uuid FOR UPDATE OF c;
  
  IF NOT FOUND THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Passageiro sem comunidade');
  END IF;
  
  -- Verificar comunidade ativa DENTRO DA TRANSAÇÃO
  SELECT COUNT(*) INTO community_active_count
  FROM drivers WHERE community_id = passenger_community.id AND is_active = true;
  
  IF community_active_count < 3 AND NOT allow_external_drivers_param THEN
    ROLLBACK;
    RETURN json_build_object('success', false, 'error', 'Comunidade inativa');
  END IF;
  
  -- Calcular valor
  SELECT base_additional_fee INTO config_fee
  FROM special_service_configs WHERE service_type = service_type_param AND is_active = true;
  
  total_amount_calculated := COALESCE(base_amount_param, 0) + COALESCE(additional_fee_param, config_fee, 0);
  
  -- Criar corrida
  INSERT INTO rides (passenger_id, community_id, pickup_location, destination_location,
                    service_type, allow_external_drivers, base_amount, additional_fee,
                    total_amount, service_notes, status, created_at, updated_at)
  VALUES (passenger_uuid, passenger_community.id, TRIM(pickup_location_param), 
          TRIM(destination_location_param), service_type_param, allow_external_drivers_param,
          base_amount_param, COALESCE(additional_fee_param, 0.00), total_amount_calculated,
          service_notes_param, 'pending', NOW(), NOW())
  RETURNING * INTO new_ride;
  
  -- AUDITORIA OBRIGATÓRIA
  INSERT INTO special_service_audit (ride_id, service_type, driver_id, driver_was_enabled, audit_notes)
  VALUES (new_ride.id, new_ride.service_type, NULL, false, 'Criação atômica');
  
  COMMIT;
  RETURN json_build_object('success', true, 'ride_id', new_ride.id);
  
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$$ LANGUAGE plpgsql;
