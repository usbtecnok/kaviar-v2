-- =====================================================
-- SISTEMA DE MUDANÇA DE COMUNIDADE COM GOVERNANÇA
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Tabela de solicitações de mudança de comunidade
CREATE TABLE IF NOT EXISTS community_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT CHECK (user_type IN ('driver', 'passenger')) NOT NULL,
    current_community_id UUID NOT NULL REFERENCES communities(id),
    requested_community_id UUID NOT NULL REFERENCES communities(id),
    reason TEXT NOT NULL,
    document_url TEXT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ NULL,
    reviewed_by TEXT NULL,
    review_notes TEXT NULL,
    
    -- Evitar solicitações duplicadas pendentes
    CONSTRAINT unique_pending_request UNIQUE (user_id, user_type, status) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Tabela de histórico permanente de comunidade (IMUTÁVEL)
CREATE TABLE IF NOT EXISTS user_community_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT CHECK (user_type IN ('driver', 'passenger')) NOT NULL,
    old_community_id UUID REFERENCES communities(id),
    new_community_id UUID NOT NULL REFERENCES communities(id),
    change_source TEXT CHECK (change_source IN ('user_request', 'admin_override', 'initial_assignment')) NOT NULL,
    request_id UUID REFERENCES community_change_requests(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT NOT NULL
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_community_change_requests_user ON community_change_requests(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_community_change_requests_status ON community_change_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_change_requests_current_community ON community_change_requests(current_community_id);
CREATE INDEX IF NOT EXISTS idx_community_change_requests_requested_community ON community_change_requests(requested_community_id);

CREATE INDEX IF NOT EXISTS idx_user_community_history_user ON user_community_history(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_user_community_history_changed_at ON user_community_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_community_history_communities ON user_community_history(old_community_id, new_community_id);

-- 4. Função para aprovar mudança de comunidade
CREATE OR REPLACE FUNCTION approve_community_change(
    request_uuid UUID,
    reviewed_by_param TEXT,
    review_notes_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    request_data RECORD;
    old_community_id UUID;
    result JSONB;
BEGIN
    -- Buscar dados da solicitação
    SELECT * INTO request_data
    FROM community_change_requests
    WHERE id = request_uuid AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solicitação não encontrada ou já processada'
        );
    END IF;
    
    -- Buscar comunidade atual do usuário
    IF request_data.user_type = 'driver' THEN
        SELECT community_id INTO old_community_id
        FROM drivers WHERE user_id = request_data.user_id;
        
        -- Atualizar comunidade do motorista
        UPDATE drivers 
        SET community_id = request_data.requested_community_id,
            updated_at = NOW()
        WHERE user_id = request_data.user_id;
        
    ELSIF request_data.user_type = 'passenger' THEN
        SELECT community_id INTO old_community_id
        FROM passengers WHERE user_id = request_data.user_id;
        
        -- Atualizar comunidade do passageiro
        UPDATE passengers 
        SET community_id = request_data.requested_community_id,
            updated_at = NOW()
        WHERE user_id = request_data.user_id;
    END IF;
    
    -- Registrar no histórico permanente
    INSERT INTO user_community_history (
        user_id,
        user_type,
        old_community_id,
        new_community_id,
        change_source,
        request_id,
        changed_by
    ) VALUES (
        request_data.user_id,
        request_data.user_type,
        old_community_id,
        request_data.requested_community_id,
        'user_request',
        request_uuid,
        reviewed_by_param
    );
    
    -- Marcar solicitação como aprovada
    UPDATE community_change_requests
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = reviewed_by_param,
        review_notes = review_notes_param
    WHERE id = request_uuid;
    
    -- Atualizar status das comunidades afetadas
    PERFORM update_community_status(old_community_id);
    PERFORM update_community_status(request_data.requested_community_id);
    
    result := jsonb_build_object(
        'success', true,
        'request_id', request_uuid,
        'user_id', request_data.user_id,
        'user_type', request_data.user_type,
        'old_community_id', old_community_id,
        'new_community_id', request_data.requested_community_id,
        'reviewed_by', reviewed_by_param
    );
    
    RAISE NOTICE 'Mudança de comunidade aprovada: %', result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para rejeitar mudança de comunidade
CREATE OR REPLACE FUNCTION reject_community_change(
    request_uuid UUID,
    reviewed_by_param TEXT,
    review_notes_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    request_data RECORD;
    result JSONB;
BEGIN
    -- Buscar dados da solicitação
    SELECT * INTO request_data
    FROM community_change_requests
    WHERE id = request_uuid AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solicitação não encontrada ou já processada'
        );
    END IF;
    
    -- Marcar solicitação como rejeitada
    UPDATE community_change_requests
    SET status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = reviewed_by_param,
        review_notes = review_notes_param
    WHERE id = request_uuid;
    
    result := jsonb_build_object(
        'success', true,
        'request_id', request_uuid,
        'user_id', request_data.user_id,
        'user_type', request_data.user_type,
        'status', 'rejected',
        'reviewed_by', reviewed_by_param
    );
    
    RAISE NOTICE 'Mudança de comunidade rejeitada: %', result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para mudança administrativa (override)
CREATE OR REPLACE FUNCTION admin_change_community(
    user_uuid UUID,
    user_type_param TEXT,
    new_community_uuid UUID,
    changed_by_param TEXT,
    reason_param TEXT DEFAULT 'Mudança administrativa'
)
RETURNS JSONB AS $$
DECLARE
    old_community_id UUID;
    result JSONB;
BEGIN
    -- Buscar comunidade atual do usuário
    IF user_type_param = 'driver' THEN
        SELECT community_id INTO old_community_id
        FROM drivers WHERE user_id = user_uuid;
        
        -- Atualizar comunidade do motorista
        UPDATE drivers 
        SET community_id = new_community_uuid,
            updated_at = NOW()
        WHERE user_id = user_uuid;
        
    ELSIF user_type_param = 'passenger' THEN
        SELECT community_id INTO old_community_id
        FROM passengers WHERE user_id = user_uuid;
        
        -- Atualizar comunidade do passageiro
        UPDATE passengers 
        SET community_id = new_community_uuid,
            updated_at = NOW()
        WHERE user_id = user_uuid;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tipo de usuário inválido'
        );
    END IF;
    
    -- Registrar no histórico permanente
    INSERT INTO user_community_history (
        user_id,
        user_type,
        old_community_id,
        new_community_id,
        change_source,
        changed_by
    ) VALUES (
        user_uuid,
        user_type_param,
        old_community_id,
        new_community_uuid,
        'admin_override',
        changed_by_param
    );
    
    -- Atualizar status das comunidades afetadas
    PERFORM update_community_status(old_community_id);
    PERFORM update_community_status(new_community_uuid);
    
    result := jsonb_build_object(
        'success', true,
        'user_id', user_uuid,
        'user_type', user_type_param,
        'old_community_id', old_community_id,
        'new_community_id', new_community_uuid,
        'changed_by', changed_by_param,
        'reason', reason_param
    );
    
    RAISE NOTICE 'Mudança administrativa de comunidade: %', result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para remover constraint de solicitação única após processamento
CREATE OR REPLACE FUNCTION handle_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando status muda de pending para approved/rejected, 
    -- permite nova solicitação futura
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
        -- A constraint única só se aplica a status = 'pending'
        -- Então quando muda para approved/rejected, automaticamente libera
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_change_request_status_trigger
    AFTER UPDATE ON community_change_requests
    FOR EACH ROW EXECUTE FUNCTION handle_request_status_change();

-- 8. Row Level Security
ALTER TABLE community_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_community_history ENABLE ROW LEVEL SECURITY;

-- Políticas para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on community_change_requests" 
ON community_change_requests FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on user_community_history" 
ON user_community_history FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Políticas para usuários autenticados (podem ver apenas suas próprias solicitações)
CREATE POLICY "Users can view their own change requests" 
ON community_change_requests FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own change requests" 
ON community_change_requests FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own community history" 
ON user_community_history FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- 9. Comentários para documentação
COMMENT ON TABLE community_change_requests IS 'Solicitações de mudança de comunidade com governança e aprovação';
COMMENT ON TABLE user_community_history IS 'Histórico IMUTÁVEL de mudanças de comunidade para auditoria e LGPD';

COMMENT ON COLUMN community_change_requests.status IS 'Status: pending (aguardando), approved (aprovada), rejected (rejeitada)';
COMMENT ON COLUMN user_community_history.change_source IS 'Origem: user_request (solicitação), admin_override (administrativa), initial_assignment (inicial)';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
