-- =====================================================
-- FUNÇÕES DE A/B TESTING E MÉTRICAS - BACKEND
-- =====================================================

-- 1️⃣ FUNÇÃO PARA DETERMINAR GRUPO A/B
CREATE OR REPLACE FUNCTION assign_ab_test_group(ride_uuid UUID)
RETURNS CHAR(1) AS $$
DECLARE
    config_enabled BOOLEAN;
    group_a_pct INTEGER;
    random_value INTEGER;
BEGIN
    -- Verificar se A/B test está habilitado
    SELECT is_enabled, group_a_percentage 
    INTO config_enabled, group_a_pct
    FROM ab_test_config 
    WHERE feature_name = 'first_accept_bonus';
    
    -- Se não habilitado, sempre grupo B (sem bônus)
    IF NOT config_enabled THEN
        RETURN 'B';
    END IF;
    
    -- Gerar número aleatório baseado no UUID da corrida (determinístico)
    random_value := (('x' || substr(ride_uuid::text, 1, 8))::bit(32)::int % 100);
    
    -- Atribuir grupo baseado na porcentagem
    IF random_value < group_a_pct THEN
        RETURN 'A';
    ELSE
        RETURN 'B';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ FUNÇÃO PARA APLICAR BÔNUS DE ACEITE IMEDIATO
CREATE OR REPLACE FUNCTION apply_first_accept_bonus(
    ride_uuid UUID,
    base_fare DECIMAL(10,2) DEFAULT 15.00
)
RETURNS TABLE(
    has_bonus BOOLEAN,
    ab_group CHAR(1),
    bonus_amount DECIMAL(10,2)
) AS $$
DECLARE
    assigned_group CHAR(1);
    bonus_value DECIMAL(10,2) := 0.00;
    has_bonus_flag BOOLEAN := FALSE;
BEGIN
    -- Determinar grupo A/B
    assigned_group := assign_ab_test_group(ride_uuid);
    
    -- Aplicar bônus apenas para grupo A
    IF assigned_group = 'A' THEN
        has_bonus_flag := TRUE;
        bonus_value := ROUND(base_fare * 0.20, 2); -- 20% do valor base
    END IF;
    
    -- Atualizar a corrida com as informações
    UPDATE rides 
    SET 
        ab_test_group = assigned_group,
        has_first_accept_bonus = has_bonus_flag,
        bonus_amount = bonus_value,
        offer_sent_at = NOW()
    WHERE id = ride_uuid;
    
    -- Retornar resultado
    RETURN QUERY SELECT has_bonus_flag, assigned_group, bonus_value;
END;
$$ LANGUAGE plpgsql;

-- 3️⃣ FUNÇÃO PARA OBTER MÉTRICAS DE ROI
CREATE OR REPLACE FUNCTION get_bonus_roi_report(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    community_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    period_start DATE,
    period_end DATE,
    community_id UUID,
    total_rides_with_bonus INTEGER,
    total_rides_without_bonus INTEGER,
    avg_time_with_bonus DECIMAL(8,2),
    avg_time_without_bonus DECIMAL(8,2),
    time_reduction_pct DECIMAL(5,2),
    total_bonus_cost DECIMAL(10,2),
    cost_per_second_saved DECIMAL(8,4),
    estimated_roi_pct DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        start_date as period_start,
        end_date as period_end,
        brm.community_id,
        SUM(brm.rides_with_bonus_count)::INTEGER,
        SUM(brm.rides_without_bonus_count)::INTEGER,
        AVG(brm.avg_accept_time_with_bonus),
        AVG(brm.avg_accept_time_without_bonus),
        AVG(brm.time_reduction_percentage),
        SUM(brm.total_bonus_paid),
        AVG(brm.seconds_saved_per_real),
        AVG(brm.roi_percentage)
    FROM bonus_roi_metrics brm
    WHERE brm.date BETWEEN start_date AND end_date
      AND (community_filter IS NULL OR brm.community_id = community_filter)
      AND brm.total_rides > 0
    GROUP BY brm.community_id;
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ FUNÇÃO PARA ATIVAR/DESATIVAR A/B TEST
CREATE OR REPLACE FUNCTION toggle_ab_test(
    feature TEXT,
    enabled BOOLEAN,
    group_a_pct INTEGER DEFAULT 50
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ab_test_config 
    SET 
        is_enabled = enabled,
        group_a_percentage = group_a_pct,
        updated_at = NOW()
    WHERE feature_name = feature;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ FUNÇÃO PARA QUERY OTIMIZADA DE MÉTRICAS DIÁRIAS
CREATE OR REPLACE FUNCTION get_daily_metrics_summary(
    target_date DATE DEFAULT CURRENT_DATE,
    community_filter UUID DEFAULT NULL
)
RETURNS TABLE(
    date DATE,
    community_id UUID,
    total_rides INTEGER,
    bonus_rides INTEGER,
    regular_rides INTEGER,
    avg_accept_time_bonus DECIMAL(8,2),
    avg_accept_time_regular DECIMAL(8,2),
    time_improvement_seconds DECIMAL(8,2),
    total_bonus_paid DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dam.date,
        dam.community_id,
        dam.total_rides,
        dam.rides_with_bonus_count,
        dam.rides_without_bonus_count,
        dam.avg_accept_time_with_bonus,
        dam.avg_accept_time_without_bonus,
        (dam.avg_accept_time_without_bonus - dam.avg_accept_time_with_bonus) as time_improvement,
        dam.total_bonus_paid
    FROM daily_accept_metrics dam
    WHERE dam.date = target_date
      AND (community_filter IS NULL OR dam.community_id = community_filter)
      AND dam.total_rides > 0
    ORDER BY dam.community_id;
END;
$$ LANGUAGE plpgsql;
