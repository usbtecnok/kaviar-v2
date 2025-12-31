-- =====================================================
-- SISTEMA DE PÂNICO + ÁUDIO SEGURO (LGPD)
-- =====================================================

-- 1. ADICIONAR CAMPO DE EMERGÊNCIA ÀS CONVERSAS
ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS emergency_started_at TIMESTAMPTZ NULL;

-- 2. TABELA DE EVENTOS DE EMERGÊNCIA
CREATE TABLE IF NOT EXISTS emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    trigger_type TEXT CHECK (trigger_type IN ('keyword', 'panic_button', 'manual')) NOT NULL,
    trigger_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
    location_lat DECIMAL(10, 8) NULL,
    location_lng DECIMAL(11, 8) NULL,
    audio_consent_given BOOLEAN DEFAULT FALSE,
    audio_consent_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
    audio_file_path TEXT NULL,
    audio_file_size INTEGER NULL,
    status TEXT CHECK (status IN ('active', 'resolved', 'cancelled')) DEFAULT 'active',
    resolved_by TEXT NULL,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_emergency ON whatsapp_conversations(is_emergency, emergency_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_events_conversation ON emergency_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_status ON emergency_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_events_audio_consent ON emergency_events(audio_consent_given);

-- 4. TRIGGER PARA UPDATED_AT
CREATE TRIGGER update_emergency_events_updated_at 
    BEFORE UPDATE ON emergency_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS PARA EMERGENCY_EVENTS
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on emergency_events" 
ON emergency_events FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Admin auth read emergency_events" 
ON emergency_events FOR SELECT 
TO authenticated 
USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 6. HABILITAR REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_events;

-- 7. FUNÇÃO PARA DETECTAR PALAVRAS-CHAVE DE EMERGÊNCIA
CREATE OR REPLACE FUNCTION detect_emergency_keywords(message_body TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF message_body IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Palavras-chave de emergência (case insensitive)
    RETURN (
        LOWER(message_body) ~ '\b(perigo|socorro|ajuda|emergencia|emergência|assalto|sequestro|acidente|pânico|panico)\b'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE emergency_events IS 'Registro de eventos de emergência com consentimento LGPD';
COMMENT ON COLUMN emergency_events.trigger_type IS 'Como a emergência foi ativada: keyword, panic_button, manual';
COMMENT ON COLUMN emergency_events.audio_consent_given IS 'Se usuário deu consentimento explícito para áudio';
COMMENT ON COLUMN emergency_events.audio_file_path IS 'Caminho do arquivo no Supabase Storage';

-- =====================================================
-- CONFIGURAÇÃO CONCLUÍDA
-- =====================================================
