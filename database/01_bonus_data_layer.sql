-- =====================================================
-- IMPLEMENTAÇÃO CAMADA DE DADOS - BÔNUS ACEITE IMEDIATO
-- =====================================================

-- 1️⃣ EXTENSÃO DA TABELA RIDES
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accept_time_seconds BIGINT,
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

-- 3️⃣ TABELA DE MÉTRICAS AGREGADAS
CREATE TABLE IF NOT EXISTS daily_accept_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    community_id UUID REFERENCES communities(id),
    driver_id UUID REFERENCES drivers(id),
    
    rides_with_bonus_count BIGINT DEFAULT 0,
    avg_accept_time_with_bonus DECIMAL(8,2),
    total_bonus_paid DECIMAL(10,2) DEFAULT 0.00,
    
    rides_without_bonus_count BIGINT DEFAULT 0,
    avg_accept_time_without_bonus DECIMAL(8,2),
    
    total_rides BIGINT DEFAULT 0,
    overall_avg_accept_time DECIMAL(8,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(date, community_id, driver_id)
);

-- 4️⃣ VIEW PARA ROI
CREATE OR REPLACE VIEW bonus_roi_metrics AS
SELECT 
    date,
    community_id,
    rides_with_bonus_count,
    rides_without_bonus_count,
    total_rides,
    avg_accept_time_with_bonus,
    avg_accept_time_without_bonus,
    
    CASE 
        WHEN avg_accept_time_without_bonus > 0 AND avg_accept_time_with_bonus > 0 
        THEN ROUND(((avg_accept_time_without_bonus - avg_accept_time_with_bonus) / avg_accept_time_without_bonus * 100), 2)
        ELSE 0 
    END as time_reduction_percentage,
    
    total_bonus_paid,
    
    CASE 
        WHEN avg_accept_time_without_bonus > avg_accept_time_with_bonus AND total_bonus_paid > 0
        THEN ROUND((avg_accept_time_without_bonus - avg_accept_time_with_bonus) / NULLIF(total_bonus_paid, 0), 4)
        ELSE 0 
    END as seconds_saved_per_real,
    
    CASE 
        WHEN total_bonus_paid > 0 AND avg_accept_time_without_bonus > avg_accept_time_with_bonus
        THEN ROUND((((avg_accept_time_without_bonus - avg_accept_time_with_bonus) * rides_with_bonus_count * 0.15) - total_bonus_paid) / NULLIF(total_bonus_paid, 0) * 100, 2)
        ELSE 0 
    END as roi_percentage

FROM daily_accept_metrics
WHERE total_rides > 0;

-- 5️⃣ ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rides_offer_sent_at ON rides(offer_sent_at);
CREATE INDEX IF NOT EXISTS idx_rides_accepted_at ON rides(accepted_at);
CREATE INDEX IF NOT EXISTS idx_rides_has_bonus ON rides(has_first_accept_bonus);
CREATE INDEX IF NOT EXISTS idx_rides_ab_test_group ON rides(ab_test_group);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_accept_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_community ON daily_accept_metrics(community_id, date);

-- Índice composto para queries de métricas (performance crítica)
CREATE INDEX IF NOT EXISTS idx_rides_metrics_composite ON rides(accepted_at, status, accept_time_seconds) 
WHERE status = 'accepted' AND accept_time_seconds IS NOT NULL;

-- 6️⃣ INSERIR CONFIGURAÇÃO INICIAL
INSERT INTO ab_test_config (feature_name, is_enabled, group_a_percentage) 
VALUES ('first_accept_bonus', FALSE, 50)
ON CONFLICT (feature_name) DO NOTHING;

-- 7️⃣ TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ab_test_config_updated_at 
    BEFORE UPDATE ON ab_test_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
