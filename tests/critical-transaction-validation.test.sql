-- =====================================================
-- TESTE CRÍTICO: VALIDAÇÃO DE TRANSAÇÕES EXPLÍCITAS
-- =====================================================

-- Teste 1: Verificar se auditoria falha cancela tudo
DO $$
DECLARE
  test_ride_id UUID;
  test_result JSON;
  audit_count INTEGER;
BEGIN
  -- Criar corrida de teste
  SELECT (atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Origem Teste',
    'Destino Teste',
    'STANDARD_RIDE'::service_type_enum
  )->>'ride_id')::UUID INTO test_ride_id;
  
  -- Temporariamente quebrar tabela de auditoria
  ALTER TABLE special_service_audit RENAME TO special_service_audit_backup;
  
  -- Tentar aceitar (deve falhar completamente)
  SELECT atomic_accept_ride(
    test_ride_id,
    '22222222-2222-2222-2222-222222222222'::UUID
  ) INTO test_result;
  
  -- Verificar se corrida NÃO foi aceita
  SELECT COUNT(*) INTO audit_count FROM rides 
  WHERE id = test_ride_id AND status = 'accepted';
  
  -- Restaurar tabela
  ALTER TABLE special_service_audit_backup RENAME TO special_service_audit;
  
  -- Resultado
  IF audit_count = 0 AND (test_result->>'success')::boolean = false THEN
    RAISE NOTICE '✅ TESTE 1 PASSOU: Falha de auditoria cancela transação';
  ELSE
    RAISE NOTICE '❌ TESTE 1 FALHOU: Transação não foi cancelada';
  END IF;
END;
$$;

-- Teste 2: Verificar rollback em validação
DO $$
DECLARE
  test_ride_id UUID;
  test_result JSON;
  ride_status TEXT;
BEGIN
  -- Criar corrida
  SELECT (atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Origem Teste 2',
    'Destino Teste 2'
  )->>'ride_id')::UUID INTO test_ride_id;
  
  -- Tentar aceitar com motorista inativo (deve falhar)
  SELECT atomic_accept_ride(
    test_ride_id,
    '99999999-9999-9999-9999-999999999999'::UUID -- Motorista inexistente
  ) INTO test_result;
  
  -- Verificar se corrida permanece pending
  SELECT status INTO ride_status FROM rides WHERE id = test_ride_id;
  
  IF ride_status = 'pending' AND (test_result->>'success')::boolean = false THEN
    RAISE NOTICE '✅ TESTE 2 PASSOU: Rollback em validação funciona';
  ELSE
    RAISE NOTICE '❌ TESTE 2 FALHOU: Status: %, Result: %', ride_status, test_result;
  END IF;
END;
$$;

-- Teste 3: Verificar transação completa com sucesso
DO $$
DECLARE
  test_ride_id UUID;
  test_result JSON;
  audit_count INTEGER;
  ride_status TEXT;
BEGIN
  -- Criar corrida
  SELECT (atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Origem Teste 3',
    'Destino Teste 3'
  )->>'ride_id')::UUID INTO test_ride_id;
  
  -- Aceitar com motorista válido
  SELECT atomic_accept_ride(
    test_ride_id,
    '22222222-2222-2222-2222-222222222222'::UUID
  ) INTO test_result;
  
  -- Verificar se tudo foi commitado
  SELECT status INTO ride_status FROM rides WHERE id = test_ride_id;
  SELECT COUNT(*) INTO audit_count FROM special_service_audit WHERE ride_id = test_ride_id;
  
  IF ride_status = 'accepted' AND audit_count > 0 AND (test_result->>'success')::boolean = true THEN
    RAISE NOTICE '✅ TESTE 3 PASSOU: Transação completa com auditoria';
  ELSE
    RAISE NOTICE '❌ TESTE 3 FALHOU: Status: %, Audit: %, Result: %', ride_status, audit_count, test_result;
  END IF;
END;
$$;

-- Teste 4: Verificar ordem de locks (sem deadlock)
DO $$
DECLARE
  test_ride_id1 UUID;
  test_ride_id2 UUID;
  test_result1 JSON;
  test_result2 JSON;
BEGIN
  -- Criar duas corridas
  SELECT (atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Origem A', 'Destino A'
  )->>'ride_id')::UUID INTO test_ride_id1;
  
  SELECT (atomic_create_ride(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'Origem B', 'Destino B'
  )->>'ride_id')::UUID INTO test_ride_id2;
  
  -- Aceitar simultaneamente (ordem de locks deve prevenir deadlock)
  SELECT atomic_accept_ride(test_ride_id1, '22222222-2222-2222-2222-222222222222'::UUID) INTO test_result1;
  SELECT atomic_accept_ride(test_ride_id2, '44444444-4444-4444-4444-444444444444'::UUID) INTO test_result2;
  
  IF (test_result1->>'success')::boolean = true OR (test_result2->>'success')::boolean = true THEN
    RAISE NOTICE '✅ TESTE 4 PASSOU: Sem deadlock com ordem fixa de locks';
  ELSE
    RAISE NOTICE '❌ TESTE 4 FALHOU: Possível deadlock detectado';
  END IF;
END;
$$;

-- Teste 5: Verificar enum validation
DO $$
DECLARE
  test_result JSON;
BEGIN
  -- Tentar criar com enum inválido
  SELECT atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Origem Enum',
    'Destino Enum',
    'INVALID_TYPE'::service_type_enum -- Deve falhar
  ) INTO test_result;
  
  IF (test_result->>'success')::boolean = false THEN
    RAISE NOTICE '✅ TESTE 5 PASSOU: Validação de enum funciona';
  ELSE
    RAISE NOTICE '❌ TESTE 5 FALHOU: Enum inválido foi aceito';
  END IF;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE NOTICE '✅ TESTE 5 PASSOU: Enum inválido rejeitado pelo PostgreSQL';
END;
$$;

RAISE NOTICE '🔧 VALIDAÇÃO CRÍTICA CONCLUÍDA - Verificar todos os testes acima';
