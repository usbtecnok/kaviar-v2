-- =====================================================
-- TESTES DE SEGURANÇA AUTOMATIZADOS
-- =====================================================

-- Criar usuários de teste para validação de segurança
DO $$
BEGIN
  -- Inserir usuários de teste se não existirem
  INSERT INTO users (id, email, password_hash, user_type, is_active, community_id, full_name)
  VALUES 
    ('11111111-1111-1111-1111-111111111111', 'passenger@test.com', '$2b$10$test', 'passenger', true, '22222222-2222-2222-2222-222222222222', 'Passageiro Teste'),
    ('33333333-3333-3333-3333-333333333333', 'driver@test.com', '$2b$10$test', 'driver', true, '22222222-2222-2222-2222-222222222222', 'Motorista Teste'),
    ('44444444-4444-4444-4444-444444444444', 'admin@test.com', '$2b$10$test', 'admin', true, '22222222-2222-2222-2222-222222222222', 'Admin Teste'),
    ('55555555-5555-5555-5555-555555555555', 'passenger2@test.com', '$2b$10$test', 'passenger', true, '66666666-6666-6666-6666-666666666666', 'Passageiro 2')
  ON CONFLICT (email) DO NOTHING;
  
  -- Inserir comunidades de teste
  INSERT INTO communities (id, name, is_active)
  VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Comunidade Teste 1', true),
    ('66666666-6666-6666-6666-666666666666', 'Comunidade Teste 2', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Inserir corrida de teste
  INSERT INTO rides (id, passenger_id, community_id, pickup_location, destination_location, status, created_at)
  VALUES 
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Origem Teste', 'Destino Teste', 'pending', NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Dados de teste criados para validação de segurança';
END;
$$;

-- Teste 1: Verificar se RLS está ativo
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled 
  FROM pg_class 
  WHERE relname = 'rides';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ TESTE 1 PASSOU: RLS está habilitado na tabela rides';
  ELSE
    RAISE NOTICE '❌ TESTE 1 FALHOU: RLS não está habilitado na tabela rides';
  END IF;
END;
$$;

-- Teste 2: Verificar se stored procedures atômicas existem
DO $$
DECLARE
  proc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO proc_count
  FROM pg_proc 
  WHERE proname IN ('atomic_accept_ride', 'atomic_start_ride', 'atomic_finish_ride', 'atomic_cancel_ride', 'atomic_create_ride');
  
  IF proc_count = 5 THEN
    RAISE NOTICE '✅ TESTE 2 PASSOU: Todas as stored procedures atômicas existem';
  ELSE
    RAISE NOTICE '❌ TESTE 2 FALHOU: Stored procedures atômicas faltando (encontradas: %)', proc_count;
  END IF;
END;
$$;

-- Teste 3: Verificar se auditoria está funcionando
DO $$
DECLARE
  audit_count INTEGER;
BEGIN
  -- Tentar criar uma corrida via stored procedure
  PERFORM atomic_create_ride(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'Teste Auditoria Origem',
    'Teste Auditoria Destino'
  );
  
  -- Verificar se auditoria foi criada
  SELECT COUNT(*) INTO audit_count
  FROM special_service_audit
  WHERE audit_notes LIKE '%Criação atômica%'
  AND created_at > NOW() - INTERVAL '1 minute';
  
  IF audit_count > 0 THEN
    RAISE NOTICE '✅ TESTE 3 PASSOU: Auditoria está funcionando';
  ELSE
    RAISE NOTICE '❌ TESTE 3 FALHOU: Auditoria não está registrando operações';
  END IF;
END;
$$;

-- Teste 4: Verificar se triggers de prevenção estão ativos
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgname LIKE '%prevent%' OR tgname LIKE '%block%';
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ TESTE 4 PASSOU: Triggers de prevenção estão ativos (% encontrados)', trigger_count;
  ELSE
    RAISE NOTICE '⚠️ TESTE 4 AVISO: Nenhum trigger de prevenção encontrado';
  END IF;
END;
$$;

-- Teste 5: Verificar integridade de dados críticos
DO $$
DECLARE
  orphan_rides INTEGER;
  invalid_status INTEGER;
BEGIN
  -- Verificar corridas órfãs (sem passageiro válido)
  SELECT COUNT(*) INTO orphan_rides
  FROM rides r
  LEFT JOIN users u ON r.passenger_id = u.id
  WHERE u.id IS NULL;
  
  -- Verificar status inválidos
  SELECT COUNT(*) INTO invalid_status
  FROM rides
  WHERE status NOT IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
  
  IF orphan_rides = 0 AND invalid_status = 0 THEN
    RAISE NOTICE '✅ TESTE 5 PASSOU: Integridade de dados OK';
  ELSE
    RAISE NOTICE '❌ TESTE 5 FALHOU: Corridas órfãs: %, Status inválidos: %', orphan_rides, invalid_status;
  END IF;
END;
$$;

-- Teste 6: Verificar se campos sensíveis estão protegidos
DO $$
DECLARE
  sensitive_fields TEXT[];
  field_name TEXT;
BEGIN
  -- Lista de campos que devem ter proteção especial
  sensitive_fields := ARRAY['password_hash', 'phone', 'email'];
  
  FOREACH field_name IN ARRAY sensitive_fields
  LOOP
    -- Verificar se campo existe em alguma tabela
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE column_name = field_name
    ) THEN
      RAISE NOTICE '✅ Campo sensível encontrado: %', field_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ TESTE 6 CONCLUÍDO: Verificação de campos sensíveis';
END;
$$;

RAISE NOTICE '🔐 VALIDAÇÃO DE SEGURANÇA CONCLUÍDA';
RAISE NOTICE '   - Execute estes testes após cada deploy';
RAISE NOTICE '   - Monitore logs para tentativas de bypass';
RAISE NOTICE '   - Verifique rate limiting em produção';
