-- =====================================================
-- SISTEMA DE INCENTIVOS E GOVERNANÇA DE COMUNIDADES
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar campos de governança às comunidades
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS min_drivers_required INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'pending';

-- Atualizar comunidade padrão para ativa
UPDATE communities 
SET status = 'active' 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Tabela de configurações de bônus
CREATE TABLE IF NOT EXISTS bonus_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    bonus_type TEXT CHECK (bonus_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
    bonus_value DECIMAL(10, 2) NOT NULL, -- 5.00 para 5% ou 1.50 para R$ 1,50
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuração global padrão (sem community_id = global)
INSERT INTO bonus_config (community_id, bonus_type, bonus_value) 
VALUES (NULL, 'percentage', 5.00)
ON CONFLICT DO NOTHING;

-- 3. Tabela de ganhos do motorista
CREATE TABLE IF NOT EXISTS driver_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    base_amount DECIMAL(10, 2) NOT NULL,
    bonus_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    bonus_type TEXT CHECK (bonus_type IN ('community_bonus', 'none')) DEFAULT 'none',
    bonus_config_used JSONB, -- Snapshot da config usada
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_communities_status ON communities(status);
CREATE INDEX IF NOT EXISTS idx_communities_min_drivers ON communities(min_drivers_required);
CREATE INDEX IF NOT EXISTS idx_bonus_config_community ON bonus_config(community_id);
CREATE INDEX IF NOT EXISTS idx_bonus_config_active ON bonus_config(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride ON driver_earnings(ride_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created ON driver_earnings(created_at DESC);

-- 5. Triggers para updated_at
CREATE TRIGGER update_bonus_config_updated_at 
    BEFORE UPDATE ON bonus_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Função para contar motoristas ativos por comunidade
CREATE OR REPLACE FUNCTION count_active_drivers_in_community(community_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    driver_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO driver_count
    FROM drivers 
    WHERE community_id = community_uuid;
    -- Assumindo que todos os drivers cadastrados estão ativos
    -- Pode ser ajustado para incluir campo is_active se necessário
    
    RETURN COALESCE(driver_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 7. Função para atualizar status da comunidade
CREATE OR REPLACE FUNCTION update_community_status(community_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_drivers INTEGER;
    min_required INTEGER;
    current_status TEXT;
BEGIN
    -- Buscar dados atuais da comunidade
    SELECT min_drivers_required, status 
    INTO min_required, current_status
    FROM communities 
    WHERE id = community_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Contar motoristas ativos
    current_drivers := count_active_drivers_in_community(community_uuid);
    
    -- Atualizar status baseado na regra
    IF current_drivers >= min_required AND current_status != 'active' THEN
        UPDATE communities 
        SET status = 'active', updated_at = NOW()
        WHERE id = community_uuid;
        
        RAISE NOTICE 'Comunidade % ativada: % motoristas (min: %)', 
                     community_uuid, current_drivers, min_required;
        RETURN TRUE;
        
    ELSIF current_drivers < min_required AND current_status = 'active' THEN
        UPDATE communities 
        SET status = 'pending', updated_at = NOW()
        WHERE id = community_uuid;
        
        RAISE NOTICE 'Comunidade % desativada: % motoristas (min: %)', 
                     community_uuid, current_drivers, min_required;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. Função para calcular bônus do motorista local
CREATE OR REPLACE FUNCTION calculate_community_bonus(
    driver_uuid UUID, 
    ride_uuid UUID, 
    base_amount_param DECIMAL
)
RETURNS TABLE(
    bonus_amount DECIMAL,
    bonus_type TEXT,
    config_used JSONB
) AS $$
DECLARE
    driver_community_id UUID;
    ride_community_id UUID;
    ride_allows_external BOOLEAN;
    bonus_config_rec RECORD;
    calculated_bonus DECIMAL := 0.00;
BEGIN
    -- Buscar dados do motorista e corrida
    SELECT d.community_id INTO driver_community_id
    FROM drivers d WHERE d.id = driver_uuid;
    
    SELECT r.community_id, r.allow_external_drivers 
    INTO ride_community_id, ride_allows_external
    FROM rides r WHERE r.id = ride_uuid;
    
    -- Verificar se é elegível para bônus comunitário
    IF driver_community_id = ride_community_id AND ride_allows_external = FALSE THEN
        
        -- Buscar configuração de bônus (específica da comunidade ou global)
        SELECT bc.bonus_type, bc.bonus_value, bc.id, bc.community_id
        INTO bonus_config_rec
        FROM bonus_config bc
        WHERE (bc.community_id = driver_community_id OR bc.community_id IS NULL)
        AND bc.is_active = TRUE
        ORDER BY bc.community_id NULLS LAST -- Priorizar específica da comunidade
        LIMIT 1;
        
        IF FOUND THEN
            -- Calcular bônus baseado no tipo
            IF bonus_config_rec.bonus_type = 'percentage' THEN
                calculated_bonus := base_amount_param * (bonus_config_rec.bonus_value / 100.0);
            ELSIF bonus_config_rec.bonus_type = 'fixed' THEN
                calculated_bonus := bonus_config_rec.bonus_value;
            END IF;
            
            -- Retornar resultado
            RETURN QUERY SELECT 
                calculated_bonus,
                'community_bonus'::TEXT,
                jsonb_build_object(
                    'config_id', bonus_config_rec.id,
                    'bonus_type', bonus_config_rec.bonus_type,
                    'bonus_value', bonus_config_rec.bonus_value,
                    'community_id', bonus_config_rec.community_id,
                    'base_amount', base_amount_param
                );
        END IF;
    END IF;
    
    -- Sem bônus
    RETURN QUERY SELECT 
        0.00::DECIMAL,
        'none'::TEXT,
        '{}'::JSONB;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para atualizar status da comunidade quando motorista é adicionado
CREATE OR REPLACE FUNCTION trigger_update_community_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status da comunidade afetada
    IF TG_OP = 'INSERT' THEN
        PERFORM update_community_status(NEW.community_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.community_id != NEW.community_id THEN
        -- Motorista mudou de comunidade
        PERFORM update_community_status(OLD.community_id);
        PERFORM update_community_status(NEW.community_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_community_status(OLD.community_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drivers_community_status_update
    AFTER INSERT OR UPDATE OR DELETE ON drivers
    FOR EACH ROW EXECUTE FUNCTION trigger_update_community_status();

-- 10. Row Level Security
ALTER TABLE bonus_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on bonus_config" 
ON bonus_config FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on driver_earnings" 
ON driver_earnings FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 11. Comentários para documentação
COMMENT ON TABLE bonus_config IS 'Configurações de bônus por comunidade ou global';
COMMENT ON TABLE driver_earnings IS 'Extrato detalhado de ganhos do motorista por corrida';

COMMENT ON COLUMN communities.min_drivers_required IS 'Número mínimo de motoristas para ativar comunidade';
COMMENT ON COLUMN communities.status IS 'Status da comunidade: pending, active, inactive';
COMMENT ON COLUMN driver_earnings.bonus_amount IS 'Valor do bônus aplicado (R$)';
COMMENT ON COLUMN driver_earnings.bonus_type IS 'Tipo do bônus: community_bonus, none';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
