-- =====================================================
-- SISTEMA DE HISTÓRICO E VERSIONAMENTO DE RELATÓRIOS
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de histórico de relatórios
CREATE TABLE IF NOT EXISTS reports_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT CHECK (report_type IN ('weekly', 'monthly', 'custom')) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    summary_data JSONB NOT NULL,
    pdf_url TEXT NULL,
    pdf_generated BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ NULL,
    email_recipients TEXT[] DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_type, period_start, period_end)
);

-- 2. Tabela de configurações de distribuição
CREATE TABLE IF NOT EXISTS report_distribution_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT CHECK (report_type IN ('weekly', 'monthly')) NOT NULL,
    email_enabled BOOLEAN DEFAULT FALSE,
    email_recipients TEXT[] NOT NULL DEFAULT '{}',
    email_subject_template TEXT DEFAULT 'Relatório Executivo Kaviar - {period}',
    pdf_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_type)
);

-- 3. Tabela de alertas baseados em relatórios
CREATE TABLE IF NOT EXISTS report_alerts_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name TEXT NOT NULL,
    metric_path TEXT NOT NULL, -- ex: 'executive_summary.overall_roi_percent'
    operator TEXT CHECK (operator IN ('lt', 'gt', 'eq', 'lte', 'gte')) NOT NULL,
    threshold_value DECIMAL(10, 2) NOT NULL,
    alert_message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Configurações padrão de distribuição
INSERT INTO report_distribution_config (report_type, email_enabled, email_recipients) VALUES
('weekly', FALSE, '{}'),
('monthly', FALSE, '{}')
ON CONFLICT (report_type) DO NOTHING;

-- 5. Configurações padrão de alertas baseados em relatórios
INSERT INTO report_alerts_config (alert_name, metric_path, operator, threshold_value, alert_message_template) VALUES
('ROI Baixo Semanal', 'executive_summary.overall_roi_percent', 'lt', 100.00, 'ROI semanal de {value}% está abaixo do esperado (mín: {threshold}%)'),
('Custo Bônus Alto', 'financial_overview.cost_efficiency.bonus_as_percent_of_revenue', 'gt', 15.00, 'Custo de bônus de {value}% da receita está alto (máx: {threshold}%)'),
('Queda de Volume', 'executive_summary.rides_growth_percent', 'lt', -10.00, 'Volume de corridas caiu {value}% (limite: {threshold}%)')
ON CONFLICT DO NOTHING;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_reports_history_type_period ON reports_history(report_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_reports_history_generated ON reports_history(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_history_pdf ON reports_history(pdf_generated, pdf_url);
CREATE INDEX IF NOT EXISTS idx_report_distribution_active ON report_distribution_config(is_active);
CREATE INDEX IF NOT EXISTS idx_report_alerts_active ON report_alerts_config(is_active);

-- 7. Função para buscar relatório histórico
CREATE OR REPLACE FUNCTION get_historical_report(
    report_type_param TEXT,
    period_start_param DATE,
    period_end_param DATE
)
RETURNS JSONB AS $$
DECLARE
    report_data JSONB;
BEGIN
    SELECT summary_data INTO report_data
    FROM reports_history
    WHERE report_type = report_type_param
    AND period_start = period_start_param
    AND period_end = period_end_param;
    
    RETURN COALESCE(report_data, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- 8. Função para avaliar alertas de relatório
CREATE OR REPLACE FUNCTION evaluate_report_alerts(report_data JSONB)
RETURNS TABLE(
    alert_name TEXT,
    metric_value DECIMAL,
    threshold_value DECIMAL,
    alert_message TEXT
) AS $$
DECLARE
    alert_config RECORD;
    metric_value_extracted DECIMAL;
    formatted_message TEXT;
BEGIN
    -- Iterar sobre configurações de alerta ativas
    FOR alert_config IN 
        SELECT * FROM report_alerts_config WHERE is_active = TRUE
    LOOP
        -- Extrair valor da métrica do JSON usando o path
        BEGIN
            metric_value_extracted := (report_data #>> string_to_array(alert_config.metric_path, '.'))::DECIMAL;
        EXCEPTION WHEN OTHERS THEN
            metric_value_extracted := NULL;
        END;
        
        -- Pular se não conseguiu extrair o valor
        IF metric_value_extracted IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Avaliar condição do alerta
        IF (alert_config.operator = 'lt' AND metric_value_extracted < alert_config.threshold_value) OR
           (alert_config.operator = 'gt' AND metric_value_extracted > alert_config.threshold_value) OR
           (alert_config.operator = 'eq' AND metric_value_extracted = alert_config.threshold_value) OR
           (alert_config.operator = 'lte' AND metric_value_extracted <= alert_config.threshold_value) OR
           (alert_config.operator = 'gte' AND metric_value_extracted >= alert_config.threshold_value) THEN
            
            -- Formatar mensagem substituindo placeholders
            formatted_message := alert_config.alert_message_template;
            formatted_message := REPLACE(formatted_message, '{value}', metric_value_extracted::TEXT);
            formatted_message := REPLACE(formatted_message, '{threshold}', alert_config.threshold_value::TEXT);
            
            -- Retornar alerta
            RETURN QUERY SELECT 
                alert_config.alert_name,
                metric_value_extracted,
                alert_config.threshold_value,
                formatted_message;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Triggers para updated_at
CREATE TRIGGER update_report_distribution_config_updated_at 
    BEFORE UPDATE ON report_distribution_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_alerts_config_updated_at 
    BEFORE UPDATE ON report_alerts_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Row Level Security
ALTER TABLE reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distribution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_alerts_config ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on reports_history" 
ON reports_history FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on report_distribution_config" 
ON report_distribution_config FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on report_alerts_config" 
ON report_alerts_config FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 11. Comentários para documentação
COMMENT ON TABLE reports_history IS 'Histórico versionado de relatórios executivos gerados';
COMMENT ON TABLE report_distribution_config IS 'Configurações de distribuição automática de relatórios';
COMMENT ON TABLE report_alerts_config IS 'Configurações de alertas baseados em métricas de relatórios';

COMMENT ON COLUMN reports_history.summary_data IS 'Dados completos do relatório em formato JSON';
COMMENT ON COLUMN reports_history.pdf_url IS 'URL do PDF gerado (se disponível)';
COMMENT ON COLUMN report_alerts_config.metric_path IS 'Caminho JSON para a métrica (ex: executive_summary.overall_roi_percent)';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
