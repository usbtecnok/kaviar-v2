-- =====================================================
-- SISTEMA DE MONITORAMENTO E ANALYTICS DE INCENTIVOS
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de métricas diárias por comunidade
CREATE TABLE IF NOT EXISTS community_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_rides INTEGER DEFAULT 0,
    local_rides INTEGER DEFAULT 0,
    external_rides INTEGER DEFAULT 0,
    total_bonus_paid DECIMAL(10, 2) DEFAULT 0.00,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00,
    avg_acceptance_rate DECIMAL(5, 2) DEFAULT 0.00,
    active_drivers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, date)
);

-- 2. Expandir enum de tipos de incentivo
ALTER TABLE driver_earnings 
DROP CONSTRAINT IF EXISTS driver_earnings_bonus_type_check;

ALTER TABLE driver_earnings 
ADD CONSTRAINT driver_earnings_bonus_type_check 
CHECK (bonus_type IN ('community_bonus', 'recurrence_bonus', 'time_window_bonus', 'rating_bonus', 'none'));

-- 3. Tabela de configurações de incentivos versionadas
CREATE TABLE IF NOT EXISTS incentive_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    incentive_type TEXT CHECK (incentive_type IN ('community_bonus', 'recurrence_bonus', 'time_window_bonus', 'rating_bonus')) NOT NULL,
    config_data JSONB NOT NULL, -- Configuração flexível por tipo
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NULL,
    created_by TEXT, -- ID do admin que criou
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de eventos de aceitação/rejeição (para taxa de aceitação)
CREATE TABLE IF NOT EXISTS ride_acceptance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    event_type TEXT CHECK (event_type IN ('offered', 'accepted', 'rejected', 'timeout')) NOT NULL,
    response_time_seconds INTEGER, -- Tempo para responder
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. View materializada para métricas em tempo real
CREATE MATERIALIZED VIEW IF NOT EXISTS community_metrics_realtime AS
SELECT 
    c.id as community_id,
    c.name as community_name,
    c.status as community_status,
    
    -- Contadores de corridas (últimos 30 dias)
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') as rides_30d,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days' AND r.allow_external_drivers = false) as local_rides_30d,
    COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days' AND r.allow_external_drivers = true) as external_rides_30d,
    
    -- Métricas financeiras (últimos 30 dias)
    COALESCE(SUM(de.bonus_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 0) as total_bonus_30d,
    COALESCE(SUM(de.total_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 0) as total_revenue_30d,
    
    -- Motoristas ativos
    COUNT(DISTINCT d.id) as active_drivers,
    
    -- Taxa de corridas locais
    CASE 
        WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days') > 0 
        THEN ROUND(
            (COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days' AND r.allow_external_drivers = false)::DECIMAL / 
             COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days')) * 100, 2
        )
        ELSE 0 
    END as local_rides_percentage,
    
    -- ROI (receita - bônus) / bônus * 100
    CASE 
        WHEN COALESCE(SUM(de.bonus_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 0) > 0
        THEN ROUND(
            ((COALESCE(SUM(de.total_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 0) - 
              COALESCE(SUM(de.bonus_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 0)) / 
             COALESCE(SUM(de.bonus_amount) FILTER (WHERE de.created_at >= NOW() - INTERVAL '30 days'), 1)) * 100, 2
        )
        ELSE 0 
    END as roi_percentage,
    
    NOW() as last_updated
    
FROM communities c
LEFT JOIN rides r ON r.community_id = c.id
LEFT JOIN drivers d ON d.community_id = c.id
LEFT JOIN driver_earnings de ON de.driver_id = d.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.status;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_community_metrics_daily_date ON community_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_community_metrics_daily_community ON community_metrics_daily(community_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_incentive_configs_active ON incentive_configs(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_incentive_configs_community ON incentive_configs(community_id, incentive_type);
CREATE INDEX IF NOT EXISTS idx_ride_acceptance_events_ride ON ride_acceptance_events(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_acceptance_events_driver ON ride_acceptance_events(driver_id, created_at DESC);

-- 7. Função para calcular métricas diárias
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    community_rec RECORD;
BEGIN
    -- Para cada comunidade ativa
    FOR community_rec IN 
        SELECT id FROM communities WHERE is_active = true
    LOOP
        -- Inserir ou atualizar métricas do dia
        INSERT INTO community_metrics_daily (
            community_id,
            date,
            total_rides,
            local_rides,
            external_rides,
            total_bonus_paid,
            total_revenue,
            active_drivers
        )
        SELECT 
            community_rec.id,
            target_date,
            COUNT(DISTINCT r.id) as total_rides,
            COUNT(DISTINCT r.id) FILTER (WHERE r.allow_external_drivers = false) as local_rides,
            COUNT(DISTINCT r.id) FILTER (WHERE r.allow_external_drivers = true) as external_rides,
            COALESCE(SUM(de.bonus_amount), 0) as total_bonus_paid,
            COALESCE(SUM(de.total_amount), 0) as total_revenue,
            COUNT(DISTINCT d.id) as active_drivers
        FROM communities c
        LEFT JOIN rides r ON r.community_id = c.id 
            AND DATE(r.created_at) = target_date
        LEFT JOIN drivers d ON d.community_id = c.id
        LEFT JOIN driver_earnings de ON de.driver_id = d.id 
            AND DATE(de.created_at) = target_date
        WHERE c.id = community_rec.id
        GROUP BY c.id
        
        ON CONFLICT (community_id, date) 
        DO UPDATE SET
            total_rides = EXCLUDED.total_rides,
            local_rides = EXCLUDED.local_rides,
            external_rides = EXCLUDED.external_rides,
            total_bonus_paid = EXCLUDED.total_bonus_paid,
            total_revenue = EXCLUDED.total_revenue,
            active_drivers = EXCLUDED.active_drivers,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Métricas calculadas para %', target_date;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para registrar evento de aceitação
CREATE OR REPLACE FUNCTION record_ride_acceptance_event(
    ride_uuid UUID,
    driver_uuid UUID,
    event_type_param TEXT,
    response_time_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO ride_acceptance_events (
        ride_id,
        driver_id,
        event_type,
        response_time_seconds
    ) VALUES (
        ride_uuid,
        driver_uuid,
        event_type_param,
        response_time_param
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Função para calcular taxa de aceitação por comunidade
CREATE OR REPLACE FUNCTION get_community_acceptance_rate(
    community_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
    acceptance_rate DECIMAL;
BEGIN
    SELECT 
        CASE 
            WHEN COUNT(*) FILTER (WHERE event_type = 'offered') > 0
            THEN ROUND(
                (COUNT(*) FILTER (WHERE event_type = 'accepted')::DECIMAL / 
                 COUNT(*) FILTER (WHERE event_type = 'offered')) * 100, 2
            )
            ELSE 0 
        END
    INTO acceptance_rate
    FROM ride_acceptance_events rae
    JOIN drivers d ON d.id = rae.driver_id
    WHERE d.community_id = community_uuid
    AND rae.created_at >= NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN COALESCE(acceptance_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para atualizar view materializada
CREATE OR REPLACE FUNCTION refresh_community_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh assíncrono da view materializada
    REFRESH MATERIALIZED VIEW CONCURRENTLY community_metrics_realtime;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para refresh automático (apenas em mudanças significativas)
CREATE TRIGGER refresh_metrics_on_earnings
    AFTER INSERT OR UPDATE ON driver_earnings
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_community_metrics();

-- 11. Row Level Security
ALTER TABLE community_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_acceptance_events ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on community_metrics_daily" 
ON community_metrics_daily FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on incentive_configs" 
ON incentive_configs FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on ride_acceptance_events" 
ON ride_acceptance_events FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 12. Comentários para documentação
COMMENT ON TABLE community_metrics_daily IS 'Métricas diárias agregadas por comunidade para análise de ROI';
COMMENT ON TABLE incentive_configs IS 'Configurações versionadas de incentivos por tipo e comunidade';
COMMENT ON TABLE ride_acceptance_events IS 'Eventos de aceitação/rejeição para cálculo de taxa de aceitação';
COMMENT ON MATERIALIZED VIEW community_metrics_realtime IS 'Métricas em tempo real para dashboard (últimos 30 dias)';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
