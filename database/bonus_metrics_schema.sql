-- =====================================================
-- SISTEMA DE MÉTRICAS E A/B TESTING - BÔNUS DE ACEITE IMEDIATO
-- =====================================================

-- 1️⃣ EXTENSÃO DA TABELA RIDES PARA MÉTRICAS DE TEMPO
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accept_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS has_first_accept_bonus BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ab_test_group CHAR(1) CHECK (ab_test_group IN ('A', 'B')),
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00;

-- 2️⃣ TABELA DE CONFIGURAÇÃO A/B TEST
CREATE TABLE IF NOT EXISTS ab_test_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT FALSE,
    group_a_percentage INTEGER DEFAULT 50 CHECK (group_a_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração do bônus de aceite imediato
INSERT INTO ab_test_config (feature_name, is_enabled, group_a_percentage) 
VALUES ('first_accept_bonus', FALSE, 50)
ON CONFLICT (feature_name) DO NOTHING;

-- 3️⃣ TABELA DE MÉTRICAS AGREGADAS POR DIA
CREATE TABLE IF NOT EXISTS daily_accept_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    community_id UUID REFERENCES communities(id),
    driver_id UUID REFERENCES drivers(id),
    
    -- Métricas com bônus
    rides_with_bonus_count INTEGER DEFAULT 0,
    avg_accept_time_with_bonus DECIMAL(8,2),
    total_bonus_paid DECIMAL(10,2) DEFAULT 0.00,
    
    -- Métricas sem bônus  
    rides_without_bonus_count INTEGER DEFAULT 0,
    avg_accept_time_without_bonus DECIMAL(8,2),
    
    -- Métricas gerais
    total_rides INTEGER DEFAULT 0,
    overall_avg_accept_time DECIMAL(8,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, community_id, driver_id)
);

-- 4️⃣ VIEW PARA ROI DO INCENTIVO
CREATE OR REPLACE VIEW bonus_roi_metrics AS
SELECT 
    date,
    community_id,
    
    -- Contadores
    rides_with_bonus_count,
    rides_without_bonus_count,
    total_rides,
    
    -- Tempos médios
    avg_accept_time_with_bonus,
    avg_accept_time_without_bonus,
    
    -- Redução de tempo
    CASE 
        WHEN avg_accept_time_without_bonus > 0 AND avg_accept_time_with_bonus > 0 
        THEN ROUND(((avg_accept_time_without_bonus - avg_accept_time_with_bonus) / avg_accept_time_without_bonus * 100), 2)
        ELSE 0 
    END as time_reduction_percentage,
    
    -- Custos e ROI
    total_bonus_paid,
    CASE 
        WHEN avg_accept_time_without_bonus > avg_accept_time_with_bonus AND total_bonus_paid > 0
        THEN ROUND((avg_accept_time_without_bonus - avg_accept_time_with_bonus) / total_bonus_paid, 4)
        ELSE 0 
    END as seconds_saved_per_real,
    
    -- ROI simples (assumindo R$ 0.10 de valor por segundo economizado)
    CASE 
        WHEN total_bonus_paid > 0 
        THEN ROUND((((avg_accept_time_without_bonus - avg_accept_time_with_bonus) * rides_with_bonus_count * 0.10) - total_bonus_paid) / total_bonus_paid * 100, 2)
        ELSE 0 
    END as roi_percentage

FROM daily_accept_metrics
WHERE total_rides > 0;

-- 5️⃣ FUNÇÃO PARA CALCULAR TEMPO DE ACEITE
CREATE OR REPLACE FUNCTION calculate_accept_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular tempo apenas quando corrida é aceita
    IF NEW.status = 'accepted' AND OLD.status = 'pending' AND NEW.offer_sent_at IS NOT NULL THEN
        NEW.accepted_at = NOW();
        NEW.accept_time_seconds = EXTRACT(EPOCH FROM (NEW.accepted_at - NEW.offer_sent_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular tempo automaticamente
DROP TRIGGER IF EXISTS calculate_accept_time_trigger ON rides;
CREATE TRIGGER calculate_accept_time_trigger
    BEFORE UPDATE ON rides
    FOR EACH ROW
    EXECUTE FUNCTION calculate_accept_time();

-- 6️⃣ FUNÇÃO PARA AGREGAÇÃO DIÁRIA DE MÉTRICAS
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
        
        -- Com bônus
        COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE),
        AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE),
        SUM(bonus_amount) FILTER (WHERE has_first_accept_bonus = TRUE),
        
        -- Sem bônus
        COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE),
        AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE),
        
        -- Geral
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

-- 7️⃣ ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rides_offer_sent_at ON rides(offer_sent_at);
CREATE INDEX IF NOT EXISTS idx_rides_accepted_at ON rides(accepted_at);
CREATE INDEX IF NOT EXISTS idx_rides_has_bonus ON rides(has_first_accept_bonus);
CREATE INDEX IF NOT EXISTS idx_rides_ab_test_group ON rides(ab_test_group);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_accept_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_community ON daily_accept_metrics(community_id, date);

-- 8️⃣ TRIGGER PARA ATUALIZAR MÉTRICAS AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_daily_metrics_on_accept()
RETURNS TRIGGER AS $$
BEGIN
    -- Executar agregação para o dia da corrida aceita
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
