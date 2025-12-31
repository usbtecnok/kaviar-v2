-- =====================================================
-- KAVIAR WHATSAPP INTEGRATION - DATABASE SCHEMA
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- Projeto: xcxxcexdsbaxgmmnxkgc

-- 1. Tabela de Conversas WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_type TEXT CHECK (user_type IN ('passenger', 'driver', 'unknown')) DEFAULT 'unknown',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
    body TEXT,
    message_sid TEXT UNIQUE NOT NULL,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_id ON whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_type ON whatsapp_conversations(user_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at ON whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_sid ON whatsapp_messages(message_sid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- 4. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_conversations_updated_at 
    BEFORE UPDATE ON whatsapp_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar Real-time nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- 6. Row Level Security (RLS)
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para Service Role (backend) - acesso total
CREATE POLICY "Service role full access on whatsapp_conversations" 
ON whatsapp_conversations FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access on whatsapp_messages" 
ON whatsapp_messages FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Política para usuários autenticados (admin dashboard futuro)
CREATE POLICY "Admin read access on whatsapp_conversations" 
ON whatsapp_conversations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admin read access on whatsapp_messages" 
ON whatsapp_messages FOR SELECT 
TO authenticated 
USING (true);

-- 7. Função para normalizar número de telefone
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove 'whatsapp:' prefix se existir
    phone_input := REPLACE(phone_input, 'whatsapp:', '');
    
    -- Remove espaços, hífens, parênteses
    phone_input := REGEXP_REPLACE(phone_input, '[^0-9+]', '', 'g');
    
    -- Adiciona + se não tiver
    IF NOT phone_input LIKE '+%' THEN
        phone_input := '+' || phone_input;
    END IF;
    
    RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentários para documentação
COMMENT ON TABLE whatsapp_conversations IS 'Conversas WhatsApp ativas - uma por número de telefone';
COMMENT ON TABLE whatsapp_messages IS 'Histórico completo de mensagens WhatsApp';

COMMENT ON COLUMN whatsapp_conversations.phone IS 'Número de telefone normalizado (+5511999999999)';
COMMENT ON COLUMN whatsapp_conversations.user_id IS 'FK para users.id se usuário estiver cadastrado';
COMMENT ON COLUMN whatsapp_conversations.user_type IS 'Tipo identificado: passenger, driver, unknown';

COMMENT ON COLUMN whatsapp_messages.direction IS 'inbound = recebida, outbound = enviada';
COMMENT ON COLUMN whatsapp_messages.message_sid IS 'ID único do Twilio (SMxxxxxxxx)';
COMMENT ON COLUMN whatsapp_messages.raw_payload IS 'Payload completo do webhook Twilio';

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- Depois execute: SELECT * FROM whatsapp_conversations LIMIT 1;
-- Para verificar se as tabelas foram criadas corretamente
