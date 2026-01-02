-- =====================================================
-- VALIDAÇÃO DA CAMADA DE DADOS
-- =====================================================

-- Verificar se as colunas foram adicionadas à tabela rides
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rides' 
  AND column_name IN (
    'offer_sent_at', 
    'accepted_at', 
    'accept_time_seconds', 
    'has_first_accept_bonus', 
    'ab_test_group', 
    'bonus_amount'
  );

-- Verificar se a tabela ab_test_config foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'ab_test_config';

-- Verificar se a tabela daily_accept_metrics foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'daily_accept_metrics';

-- Verificar se a view bonus_roi_metrics foi criada
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'bonus_roi_metrics';

-- Verificar se a configuração inicial foi inserida
SELECT feature_name, is_enabled, group_a_percentage 
FROM ab_test_config 
WHERE feature_name = 'first_accept_bonus';

-- Verificar índices criados
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'rides' 
  AND indexname LIKE 'idx_rides_%';

SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'daily_accept_metrics' 
  AND indexname LIKE 'idx_daily_metrics_%';
