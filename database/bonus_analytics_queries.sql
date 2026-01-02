-- =====================================================
-- QUERIES OTIMIZADAS PARA RELATÓRIOS E DASHBOARD
-- =====================================================

-- 📊 QUERY 1: RESUMO EXECUTIVO DE ROI (ÚLTIMOS 30 DIAS)
SELECT 
    'Últimos 30 dias' as periodo,
    COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as corridas_com_bonus,
    COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as corridas_sem_bonus,
    
    -- Tempos médios
    ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as tempo_medio_com_bonus_seg,
    ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as tempo_medio_sem_bonus_seg,
    
    -- Redução de tempo
    ROUND(
        (AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE) - 
         AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE)), 1
    ) as reducao_tempo_segundos,
    
    -- Custos e ROI
    ROUND(SUM(bonus_amount), 2) as custo_total_bonus,
    ROUND(SUM(bonus_amount) / COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE), 2) as custo_medio_por_corrida,
    
    -- ROI estimado (R$ 0.15 por segundo economizado)
    ROUND(
        ((AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE) - 
          AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE)) * 
         COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) * 0.15 - 
         SUM(bonus_amount)) / SUM(bonus_amount) * 100, 2
    ) as roi_percentual

FROM rides 
WHERE accepted_at >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'accepted'
  AND accept_time_seconds IS NOT NULL;

-- 📈 QUERY 2: TENDÊNCIA DIÁRIA (ÚLTIMOS 7 DIAS)
SELECT 
    DATE(accepted_at) as data,
    COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as bonus_rides,
    COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as regular_rides,
    
    ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
    ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as avg_time_regular,
    
    ROUND(SUM(bonus_amount), 2) as daily_bonus_cost

FROM rides 
WHERE accepted_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'accepted'
  AND accept_time_seconds IS NOT NULL
GROUP BY DATE(accepted_at)
ORDER BY data DESC;

-- 🏘️ QUERY 3: PERFORMANCE POR COMUNIDADE
SELECT 
    c.name as comunidade,
    COUNT(*) as total_corridas,
    COUNT(*) FILTER (WHERE r.has_first_accept_bonus = TRUE) as corridas_bonus,
    
    ROUND(AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = TRUE), 1) as tempo_com_bonus,
    ROUND(AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE), 1) as tempo_sem_bonus,
    
    ROUND(
        (AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE) - 
         AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = TRUE)) / 
         AVG(r.accept_time_seconds) FILTER (WHERE r.has_first_accept_bonus = FALSE) * 100, 1
    ) as melhoria_percentual,
    
    ROUND(SUM(r.bonus_amount), 2) as custo_total

FROM rides r
JOIN communities c ON r.community_id = c.id
WHERE r.accepted_at >= CURRENT_DATE - INTERVAL '30 days'
  AND r.status = 'accepted'
  AND r.accept_time_seconds IS NOT NULL
GROUP BY c.id, c.name
HAVING COUNT(*) >= 10  -- Apenas comunidades com volume significativo
ORDER BY melhoria_percentual DESC;

-- ⚡ QUERY 4: ANÁLISE DE EFICÁCIA DO A/B TEST
SELECT 
    ab_test_group as grupo,
    COUNT(*) as total_corridas,
    ROUND(AVG(accept_time_seconds), 1) as tempo_medio_aceite,
    ROUND(STDDEV(accept_time_seconds), 1) as desvio_padrao,
    
    -- Percentis para análise de distribuição
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY accept_time_seconds), 1) as mediana,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY accept_time_seconds), 1) as percentil_95,
    
    ROUND(SUM(bonus_amount), 2) as custo_grupo

FROM rides 
WHERE accepted_at >= CURRENT_DATE - INTERVAL '30 days'
  AND status = 'accepted'
  AND accept_time_seconds IS NOT NULL
  AND ab_test_group IS NOT NULL
GROUP BY ab_test_group
ORDER BY grupo;

-- 💰 QUERY 5: ANÁLISE DE CUSTO-BENEFÍCIO DETALHADA
WITH metrics AS (
    SELECT 
        has_first_accept_bonus,
        COUNT(*) as rides_count,
        AVG(accept_time_seconds) as avg_time,
        SUM(bonus_amount) as total_bonus
    FROM rides 
    WHERE accepted_at >= CURRENT_DATE - INTERVAL '30 days'
      AND status = 'accepted'
      AND accept_time_seconds IS NOT NULL
    GROUP BY has_first_accept_bonus
)
SELECT 
    -- Métricas básicas
    (SELECT rides_count FROM metrics WHERE has_first_accept_bonus = TRUE) as corridas_com_bonus,
    (SELECT rides_count FROM metrics WHERE has_first_accept_bonus = FALSE) as corridas_sem_bonus,
    
    -- Tempos
    (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = TRUE) as tempo_com_bonus,
    (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = FALSE) as tempo_sem_bonus,
    
    -- Economia de tempo
    (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = FALSE) - 
    (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = TRUE) as segundos_economizados,
    
    -- Custos
    (SELECT total_bonus FROM metrics WHERE has_first_accept_bonus = TRUE) as custo_total_bonus,
    
    -- ROI com diferentes valores por segundo
    ROUND(
        (((SELECT avg_time FROM metrics WHERE has_first_accept_bonus = FALSE) - 
          (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = TRUE)) * 
         (SELECT rides_count FROM metrics WHERE has_first_accept_bonus = TRUE) * 0.10 - 
         (SELECT total_bonus FROM metrics WHERE has_first_accept_bonus = TRUE)) / 
         (SELECT total_bonus FROM metrics WHERE has_first_accept_bonus = TRUE) * 100, 2
    ) as roi_10_centavos_por_segundo,
    
    ROUND(
        (((SELECT avg_time FROM metrics WHERE has_first_accept_bonus = FALSE) - 
          (SELECT avg_time FROM metrics WHERE has_first_accept_bonus = TRUE)) * 
         (SELECT rides_count FROM metrics WHERE has_first_accept_bonus = TRUE) * 0.20 - 
         (SELECT total_bonus FROM metrics WHERE has_first_accept_bonus = TRUE)) / 
         (SELECT total_bonus FROM metrics WHERE has_first_accept_bonus = TRUE) * 100, 2
    ) as roi_20_centavos_por_segundo;
