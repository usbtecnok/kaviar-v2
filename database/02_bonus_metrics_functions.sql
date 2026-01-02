-- =====================================================
-- ETAPA 2: CÁLCULO DE MÉTRICAS - FUNÇÕES E TRIGGERS
-- =====================================================

-- 1️⃣ FUNÇÃO PARA ATRIBUIR GRUPO A/B (DETERMINÍSTICA)
CREATE OR REPLACE FUNCTION assign_ab_test_group(ride_uuid UUID)
RETURNS CHAR(1) AS $$
DECLARE
    config_enabled BOOLEAN;
    group_a_pct INTEGER;
    random_value INTEGER;
BEGIN
    SELECT is_enabled, group_a_percentage 
    INTO config_enabled, group_a_pct
    FROM ab_test_config 
    WHERE feature_name = 'first_accept_bonus';
    
    IF NOT config_enabled THEN
        RETURN 'B';
    END IF;
    
    -- Hash determinístico baseado no UUID
    random_value := (('x' || substr(ride_uuid::text, 1, 8))::bit(32)::int % 100);
    
    IF random_value < group_a_pct THEN
        RETURN 'A';
    ELSE
        RETURN 'B';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2️⃣ FUNÇÃO PARA APLICAR BÔNUS (BACKEND-ONLY) - ATÔMICA
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
    config_enabled BOOLEAN;
    group_a_pct INTEGER;
    random_value INTEGER;
    assigned_group CHAR(1);
    bonus_value DECIMAL(10,2) := 0.00;
    has_bonus_flag BOOLEAN := FALSE;
BEGIN
    -- Transação atômica: ler config + calcular + persistir
    BEGIN
        -- Ler configuração com lock
        SELECT is_enabled, group_a_percentage 
        INTO config_enabled, group_a_pct
        FROM ab_test_config 
        WHERE feature_name = 'first_accept_bonus'
        FOR UPDATE;
        
        -- Calcular grupo A/B
        IF NOT config_enabled THEN
            assigned_group := 'B';
        ELSE
            random_value := (('x' || substr(ride_uuid::text, 1, 8))::bit(32)::int % 100);
            IF random_value < group_a_pct THEN
                assigned_group := 'A';
            ELSE
                assigned_group := 'B';
            END IF;
        END IF;
        
        -- Aplicar bônus se grupo A
        IF assigned_group = 'A' THEN
            has_bonus_flag := TRUE;
            bonus_value := ROUND(base_fare * 0.20, 2);
        END IF;
        
        -- Persistir dados atomicamente
        UPDATE rides 
        SET 
            ab_test_group = assigned_group,
            has_first_accept_bonus = has_bonus_flag,
            bonus_amount = bonus_value,
            offer_sent_at = NOW()
        WHERE id = ride_uuid;
        
        -- Verificar se corrida existe
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Corrida não encontrada: %', ride_uuid;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Erro ao aplicar A/B test: %', SQLERRM;
    END;
    
    RETURN QUERY SELECT has_bonus_flag, assigned_group, bonus_value;
END;
$$ LANGUAGE plpgsql;

-- 3️⃣ FUNÇÃO PARA CALCULAR TEMPO DE ACEITE (TRIGGER)
CREATE OR REPLACE FUNCTION calculate_accept_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' AND NEW.offer_sent_at IS NOT NULL THEN
        NEW.accepted_at = NOW();
        NEW.accept_time_seconds = EXTRACT(EPOCH FROM (NEW.accepted_at - NEW.offer_sent_at))::BIGINT;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ FUNÇÃO PARA AGREGAÇÃO DIÁRIA (IDEMPOTENTE)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_accept_metrics (
        date, community_id, driver_id,
        rides_with_bonus_count, avg_accept_time_with_bonus, total_bonus_paid,
        rides_without_bonus_count, avg_accept_time_without_bonus,
        total_rides, overall_avg_accept_time
    )
    SELECT 
        target_date,
        community_id,
        driver_id,
        
        COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE),
        AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE),
        SUM(bonus_amount) FILTER (WHERE has_first_accept_bonus = TRUE),
        
        COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE),
        AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE),
        
        COUNT(*),
        AVG(accept_time_seconds)
        
    FROM rides 
    WHERE DATE(accepted_at) = target_date 
      AND status = 'accepted'
      AND accept_time_seconds IS NOT NULL
    GROUP BY community_id, driver_id
    
    ON CONFLICT (date, community_id, driver_id) 
    DO UPDATE SET
        rides_with_bonus_count = EXCLUDED.rides_with_bonus_count,
        avg_accept_time_with_bonus = EXCLUDED.avg_accept_time_with_bonus,
        total_bonus_paid = EXCLUDED.total_bonus_paid,
        rides_without_bonus_count = EXCLUDED.rides_without_bonus_count,
        avg_accept_time_without_bonus = EXCLUDED.avg_accept_time_without_bonus,
        total_rides = EXCLUDED.total_rides,
        overall_avg_accept_time = EXCLUDED.overall_avg_accept_time;
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ FUNÇÃO PARA CONTROLE A/B TEST (ADMIN)
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

-- 6️⃣ TRIGGER PARA CALCULAR TEMPO AUTOMATICAMENTE
DROP TRIGGER IF EXISTS calculate_accept_time_trigger ON rides;
CREATE TRIGGER calculate_accept_time_trigger
    BEFORE UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION calculate_accept_time();

-- 7️⃣ TRIGGER PARA AGREGAÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION update_daily_metrics_on_accept()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        PERFORM aggregate_daily_metrics(DATE(NEW.accepted_at));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_metrics_trigger ON rides;
CREATE TRIGGER update_daily_metrics_trigger
    AFTER UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_metrics_on_accept();
