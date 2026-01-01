-- =====================================================
-- SISTEMA DE COMUNIDADES (CERCA COMUNITÁRIA)
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de Comunidades
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('bairro', 'vila', 'comunidade', 'condominio')) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar comunidade padrão para migração
INSERT INTO communities (id, name, type) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Comunidade Geral', 'comunidade')
ON CONFLICT (id) DO NOTHING;

-- 3. Adicionar campos de comunidade às tabelas existentes (assumindo que existem)
-- Nota: Estas tabelas podem não existir ainda, mas preparamos para quando existirem

-- Tabela drivers (assumindo estrutura básica)
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela passengers (assumindo estrutura básica)
CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela rides (assumindo estrutura básica)
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID REFERENCES passengers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    community_id UUID NOT NULL REFERENCES communities(id),
    allow_external_drivers BOOLEAN DEFAULT FALSE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type);
CREATE INDEX IF NOT EXISTS idx_communities_is_active ON communities(is_active);
CREATE INDEX IF NOT EXISTS idx_drivers_community_id ON drivers(community_id);
CREATE INDEX IF NOT EXISTS idx_passengers_community_id ON passengers(community_id);
CREATE INDEX IF NOT EXISTS idx_rides_community_id ON rides(community_id);
CREATE INDEX IF NOT EXISTS idx_rides_allow_external ON rides(allow_external_drivers);

-- 5. Triggers para updated_at
CREATE TRIGGER update_communities_updated_at 
    BEFORE UPDATE ON communities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passengers_updated_at 
    BEFORE UPDATE ON passengers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rides_updated_at 
    BEFORE UPDATE ON rides 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Row Level Security
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on communities" 
ON communities FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on drivers" 
ON drivers FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on passengers" 
ON passengers FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on rides" 
ON rides FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Políticas para isolamento por comunidade (usuários autenticados)
CREATE POLICY "Users can only see their community data" 
ON communities FOR SELECT 
TO authenticated 
USING (true); -- Admin pode ver todas, usuários específicos serão filtrados na aplicação

-- 7. Função para verificar se motorista pode aceitar corrida
CREATE OR REPLACE FUNCTION can_driver_accept_ride(driver_uuid UUID, ride_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    driver_community_id UUID;
    ride_community_id UUID;
    ride_allows_external BOOLEAN;
BEGIN
    -- Buscar comunidade do motorista
    SELECT community_id INTO driver_community_id 
    FROM drivers WHERE id = driver_uuid;
    
    -- Buscar dados da corrida
    SELECT community_id, allow_external_drivers 
    INTO ride_community_id, ride_allows_external
    FROM rides WHERE id = ride_uuid;
    
    -- Se mesma comunidade, sempre pode
    IF driver_community_id = ride_community_id THEN
        RETURN TRUE;
    END IF;
    
    -- Se comunidades diferentes, só pode se allow_external_drivers = true
    RETURN ride_allows_external;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentários para documentação
COMMENT ON TABLE communities IS 'Comunidades para isolamento geográfico de corridas';
COMMENT ON TABLE drivers IS 'Motoristas vinculados a uma comunidade específica';
COMMENT ON TABLE passengers IS 'Passageiros vinculados a uma comunidade específica';
COMMENT ON TABLE rides IS 'Corridas com isolamento por comunidade';

COMMENT ON COLUMN rides.community_id IS 'Comunidade da corrida (herdada do passageiro)';
COMMENT ON COLUMN rides.allow_external_drivers IS 'Permite motoristas de outras comunidades';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
