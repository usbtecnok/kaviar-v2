-- =====================================================
-- EXEMPLO PRÁTICO - FLUXO COMPLETO DE MÉTRICAS
-- =====================================================

-- 📋 CENÁRIO: Motorista recebe e aceita corrida

-- 1️⃣ CRIAÇÃO DA CORRIDA (Backend chama apply_first_accept_bonus)
/*
Exemplo de uso no backend:

const rideId = '550e8400-e29b-41d4-a716-446655440000';
const baseFare = 18.50;

const result = await db.query(`
  SELECT * FROM apply_first_accept_bonus($1, $2)
`, [rideId, baseFare]);

// Resultado esperado:
// { has_bonus: true, ab_group: 'A', bonus_amount: 3.70 }
// OU
// { has_bonus: false, ab_group: 'B', bonus_amount: 0.00 }
*/

-- 2️⃣ ACEITE DA CORRIDA (Trigger calcula tempo automaticamente)
/*
Quando motorista aceita:

UPDATE rides 
SET status = 'accepted', driver_id = 'driver-uuid'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

Triggers executam automaticamente:
1. calculate_accept_time_trigger: Calcula accept_time_seconds
2. update_daily_metrics_trigger: Agrega métricas do dia
*/

-- 3️⃣ CONSULTA DE MÉTRICAS (View bonus_roi_metrics)
/*
SELECT 
  date,
  community_id,
  rides_with_bonus_count,
  rides_without_bonus_count,
  time_reduction_percentage,
  roi_percentage
FROM bonus_roi_metrics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
*/

-- 4️⃣ CONTROLE ADMIN (Ativar/Desativar A/B Test)
/*
-- Ativar A/B test com 60% grupo A
SELECT toggle_ab_test('first_accept_bonus', true, 60);

-- Desativar A/B test (todos vão para grupo B)
SELECT toggle_ab_test('first_accept_bonus', false, 50);
*/

-- 📊 EXEMPLO DE DADOS GERADOS

-- Simulação de corrida com bônus (Grupo A)
INSERT INTO rides (id, community_id, driver_id, status, offer_sent_at, accepted_at, accept_time_seconds, has_first_accept_bonus, ab_test_group, bonus_amount)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(), 
  gen_random_uuid(),
  'accepted',
  NOW() - INTERVAL '25 seconds',
  NOW(),
  25,
  true,
  'A',
  3.70
);

-- Simulação de corrida sem bônus (Grupo B)  
INSERT INTO rides (id, community_id, driver_id, status, offer_sent_at, accepted_at, accept_time_seconds, has_first_accept_bonus, ab_test_group, bonus_amount)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(), 
  'accepted',
  NOW() - INTERVAL '42 seconds',
  NOW(),
  42,
  false,
  'B',
  0.00
);

-- 📈 CONSULTA DE EXEMPLO - ROI
SELECT 
  'Exemplo ROI' as metrica,
  rides_with_bonus_count as corridas_bonus,
  rides_without_bonus_count as corridas_sem_bonus,
  avg_accept_time_with_bonus as tempo_com_bonus,
  avg_accept_time_without_bonus as tempo_sem_bonus,
  time_reduction_percentage as reducao_percentual,
  total_bonus_paid as custo_total,
  roi_percentage as roi
FROM bonus_roi_metrics
WHERE date = CURRENT_DATE
LIMIT 1;
