-- =====================================================
-- SISTEMA DE ALERTAS AUTOMÁTICOS
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de configurações de thresholds
CREATE TABLE IF NOT EXISTS alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    threshold_type TEXT CHECK (threshold_type IN ('min_roi_percent', 'max_bonus_percent_of_revenue', 'min_acceptance_rate', 'min_daily_rides')) NOT NULL,
    threshold_value DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(community_id, threshold_type)
);

-- 2. Tabela de alertas disparados
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    alert_type TEXT CHECK (alert_type IN ('roi_low', 'bonus_excessive', 'acceptance_low', 'volume_low')) NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    current_value DECIMAL(10, 2) NOT NULL,
    threshold_value DECIMAL(10, 2) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
    acknowledged_by TEXT NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configurações padrão globais
INSERT INTO alert_thresholds (community_id, threshold_type, threshold_value, created_by) VALUES
(NULL, 'min_roi_percent', 100.00, 'system'),
(NULL, 'max_bonus_percent_of_revenue', 15.00, 'system'),
(NULL, 'min_acceptance_rate', 70.00, 'system'),
(NULL, 'min_daily_rides', 5.00, 'system')
ON CONFLICT (community_id, threshold_type) DO NOTHING;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_community ON alert_thresholds(community_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_type ON alert_thresholds(threshold_type, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_events_community ON alert_events(community_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_events_type ON alert_events(alert_type, status);
CREATE INDEX IF NOT EXISTS idx_alert_events_created ON alert_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_status ON alert_events(status, created_at DESC);

-- 5. Função para buscar threshold aplicável
CREATE OR REPLACE FUNCTION get_applicable_threshold(
    community_uuid UUID,
    threshold_type_param TEXT
)
RETURNS DECIMAL AS $$
DECLARE
    threshold_value DECIMAL;
BEGIN
    -- Buscar threshold específico da comunidade primeiro, depois global
    SELECT at.threshold_value INTO threshold_value
    FROM alert_thresholds at
    WHERE (at.community_id = community_uuid OR at.community_id IS NULL)
    AND at.threshold_type = threshold_type_param
    AND at.is_active = TRUE
    ORDER BY at.community_id NULLS LAST
    LIMIT 1;
    
    RETURN COALESCE(threshold_value, 0);
END;
$$ LANGUAGE plpgsql;

-- 6. Função para criar alerta
CREATE OR REPLACE FUNCTION create_alert_event(
    community_uuid UUID,
    alert_type_param TEXT,
    severity_param TEXT,
    current_value_param DECIMAL,
    threshold_value_param DECIMAL,
    message_param TEXT,
    metadata_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    existing_alert_id UUID;
BEGIN
    -- Verificar se já existe alerta ativo do mesmo tipo para a comunidade
    SELECT id INTO existing_alert_id
    FROM alert_events
    WHERE community_id = community_uuid
    AND alert_type = alert_type_param
    AND status = 'active'
    AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;
    
    -- Se já existe alerta recente, não criar duplicado
    IF existing_alert_id IS NOT NULL THEN
        RETURN existing_alert_id;
    END IF;
    
    -- Criar novo alerta
    INSERT INTO alert_events (
        community_id,
        alert_type,
        severity,
        current_value,
        threshold_value,
        message,
        metadata
    ) VALUES (
        community_uuid,
        alert_type_param,
        severity_param,
        current_value_param,
        threshold_value_param,
        message_param,
        metadata_param
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para avaliar alertas de uma comunidade
CREATE OR REPLACE FUNCTION evaluate_community_alerts(community_uuid UUID)
RETURNS TABLE(
    alert_id UUID,
    alert_type TEXT,
    severity TEXT,
    message TEXT
) AS $$
DECLARE
    community_name TEXT;
    roi_30d DECIMAL;
    bonus_30d DECIMAL;
    revenue_30d DECIMAL;
    acceptance_rate DECIMAL;
    rides_30d INTEGER;
    
    min_roi DECIMAL;
    max_bonus_pct DECIMAL;
    min_acceptance DECIMAL;
    min_rides DECIMAL;
    
    bonus_percent_of_revenue DECIMAL;
    alert_uuid UUID;
BEGIN
    -- Buscar dados da comunidade
    SELECT c.name INTO community_name
    FROM communities c WHERE c.id = community_uuid;
    
    -- Buscar métricas da comunidade (últimos 30 dias)
    SELECT 
        cmr.roi_percentage,
        cmr.total_bonus_30d,
        cmr.total_revenue_30d,
        cmr.rides_30d
    INTO roi_30d, bonus_30d, revenue_30d, rides_30d
    FROM community_metrics_realtime cmr
    WHERE cmr.community_id = community_uuid;
    
    -- Se não há dados, pular avaliação
    IF roi_30d IS NULL THEN
        RETURN;
    END IF;
    
    -- Buscar taxa de aceitação
    SELECT get_community_acceptance_rate(community_uuid, 30) INTO acceptance_rate;
    
    -- Buscar thresholds aplicáveis
    SELECT get_applicable_threshold(community_uuid, 'min_roi_percent') INTO min_roi;
    SELECT get_applicable_threshold(community_uuid, 'max_bonus_percent_of_revenue') INTO max_bonus_pct;
    SELECT get_applicable_threshold(community_uuid, 'min_acceptance_rate') INTO min_acceptance;
    SELECT get_applicable_threshold(community_uuid, 'min_daily_rides') INTO min_rides;
    
    -- Calcular percentual de bônus sobre receita
    bonus_percent_of_revenue := CASE 
        WHEN revenue_30d > 0 THEN (bonus_30d / revenue_30d) * 100 
        ELSE 0 
    END;
    
    -- Avaliar ROI baixo
    IF roi_30d < min_roi THEN
        SELECT create_alert_event(
            community_uuid,
            'roi_low',
            CASE WHEN roi_30d < min_roi * 0.5 THEN 'high' ELSE 'medium' END,
            roi_30d,
            min_roi,
            format('ROI da comunidade %s está baixo: %.2f%% (mínimo: %.2f%%)', 
                   community_name, roi_30d, min_roi),
            jsonb_build_object(
                'community_name', community_name,
                'period_days', 30,
                'bonus_paid', bonus_30d,
                'revenue', revenue_30d
            )
        ) INTO alert_uuid;
        
        RETURN QUERY SELECT alert_uuid, 'roi_low'::TEXT, 
            CASE WHEN roi_30d < min_roi * 0.5 THEN 'high' ELSE 'medium' END::TEXT,
            format('ROI baixo: %.2f%% < %.2f%%', roi_30d, min_roi);
    END IF;
    
    -- Avaliar bônus excessivo
    IF bonus_percent_of_revenue > max_bonus_pct THEN
        SELECT create_alert_event(
            community_uuid,
            'bonus_excessive',
            CASE WHEN bonus_percent_of_revenue > max_bonus_pct * 1.5 THEN 'high' ELSE 'medium' END,
            bonus_percent_of_revenue,
            max_bonus_pct,
            format('Bônus da comunidade %s está excessivo: %.2f%% da receita (máximo: %.2f%%)', 
                   community_name, bonus_percent_of_revenue, max_bonus_pct),
            jsonb_build_object(
                'community_name', community_name,
                'bonus_amount', bonus_30d,
                'revenue_amount', revenue_30d
            )
        ) INTO alert_uuid;
        
        RETURN QUERY SELECT alert_uuid, 'bonus_excessive'::TEXT,
            CASE WHEN bonus_percent_of_revenue > max_bonus_pct * 1.5 THEN 'high' ELSE 'medium' END::TEXT,
            format('Bônus excessivo: %.2f%% > %.2f%%', bonus_percent_of_revenue, max_bonus_pct);
    END IF;
    
    -- Avaliar taxa de aceitação baixa
    IF acceptance_rate < min_acceptance THEN
        SELECT create_alert_event(
            community_uuid,
            'acceptance_low',
            CASE WHEN acceptance_rate < min_acceptance * 0.7 THEN 'high' ELSE 'medium' END,
            acceptance_rate,
            min_acceptance,
            format('Taxa de aceitação da comunidade %s está baixa: %.2f%% (mínimo: %.2f%%)', 
                   community_name, acceptance_rate, min_acceptance),
            jsonb_build_object(
                'community_name', community_name,
                'period_days', 30
            )
        ) INTO alert_uuid;
        
        RETURN QUERY SELECT alert_uuid, 'acceptance_low'::TEXT,
            CASE WHEN acceptance_rate < min_acceptance * 0.7 THEN 'high' ELSE 'medium' END::TEXT,
            format('Aceitação baixa: %.2f%% < %.2f%%', acceptance_rate, min_acceptance);
    END IF;
    
    -- Avaliar volume baixo
    IF rides_30d < min_rides THEN
        SELECT create_alert_event(
            community_uuid,
            'volume_low',
            CASE WHEN rides_30d = 0 THEN 'critical' ELSE 'low' END,
            rides_30d,
            min_rides,
            format('Volume de corridas da comunidade %s está baixo: %s corridas em 30 dias (mínimo: %.0f)', 
                   community_name, rides_30d, min_rides),
            jsonb_build_object(
                'community_name', community_name,
                'period_days', 30
            )
        ) INTO alert_uuid;
        
        RETURN QUERY SELECT alert_uuid, 'volume_low'::TEXT,
            CASE WHEN rides_30d = 0 THEN 'critical' ELSE 'low' END::TEXT,
            format('Volume baixo: %s < %.0f corridas', rides_30d, min_rides);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Triggers para updated_at
CREATE TRIGGER update_alert_thresholds_updated_at 
    BEFORE UPDATE ON alert_thresholds 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Row Level Security
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on alert_thresholds" 
ON alert_thresholds FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on alert_events" 
ON alert_events FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 10. Comentários para documentação
COMMENT ON TABLE alert_thresholds IS 'Configurações de limites para alertas automáticos';
COMMENT ON TABLE alert_events IS 'Histórico de alertas disparados pelo sistema';

COMMENT ON COLUMN alert_thresholds.threshold_type IS 'Tipo de threshold: min_roi_percent, max_bonus_percent_of_revenue, min_acceptance_rate, min_daily_rides';
COMMENT ON COLUMN alert_events.alert_type IS 'Tipo de alerta: roi_low, bonus_excessive, acceptance_low, volume_low';
COMMENT ON COLUMN alert_events.severity IS 'Severidade: low, medium, high, critical';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
