-- =====================================================
-- TESTES DE VALIDAÇÃO - CÁLCULO DE MÉTRICAS
-- =====================================================

-- 🧪 TESTE 1: Função assign_ab_test_group (Determinística)
-- Mesmo UUID deve sempre retornar mesmo grupo
SELECT 
    'Teste Determinístico' as teste,
    assign_ab_test_group('550e8400-e29b-41d4-a716-446655440000') as grupo_1,
    assign_ab_test_group('550e8400-e29b-41d4-a716-446655440000') as grupo_2,
    assign_ab_test_group('550e8400-e29b-41d4-a716-446655440000') as grupo_3;

-- 🧪 TESTE 2: Distribuição A/B (50/50)
-- Verificar se distribuição está próxima de 50/50
WITH test_uuids AS (
    SELECT gen_random_uuid() as uuid
    FROM generate_series(1, 100)
),
group_distribution AS (
    SELECT assign_ab_test_group(uuid) as grupo
    FROM test_uuids
)
SELECT 
    'Distribuição A/B' as teste,
    COUNT(*) FILTER (WHERE grupo = 'A') as grupo_a,
    COUNT(*) FILTER (WHERE grupo = 'B') as grupo_b,
    ROUND(COUNT(*) FILTER (WHERE grupo = 'A') * 100.0 / COUNT(*), 1) as percentual_a
FROM group_distribution;

-- 🧪 TESTE 3: Função apply_first_accept_bonus
-- Simular aplicação de bônus
SELECT 
    'Aplicação de Bônus' as teste,
    has_bonus,
    ab_group,
    bonus_amount
FROM apply_first_accept_bonus('550e8400-e29b-41d4-a716-446655440000', 25.00);

-- 🧪 TESTE 4: Verificar se triggers foram criados
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('calculate_accept_time_trigger', 'update_daily_metrics_trigger');

-- 🧪 TESTE 5: Função toggle_ab_test
SELECT 
    'Controle A/B Test' as teste,
    toggle_ab_test('first_accept_bonus', true, 60) as resultado;

-- Verificar se foi atualizado
SELECT 
    feature_name,
    is_enabled,
    group_a_percentage
FROM ab_test_config 
WHERE feature_name = 'first_accept_bonus';

-- 🧪 TESTE 6: Função aggregate_daily_metrics (Idempotente)
-- Executar múltiplas vezes deve dar mesmo resultado
SELECT aggregate_daily_metrics(CURRENT_DATE);
SELECT aggregate_daily_metrics(CURRENT_DATE);
SELECT aggregate_daily_metrics(CURRENT_DATE);

SELECT 'Agregação Idempotente' as teste, COUNT(*) as registros
FROM daily_accept_metrics 
WHERE date = CURRENT_DATE;
