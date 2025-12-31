-- =====================================================
-- AJUSTES CRÍTICOS - ALINHAMENTO E MELHORIAS
-- =====================================================

-- 1. ÍNDICE ÚNICO PARA MESSAGE_SID (previne duplicatas Twilio)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_sid_unique 
ON whatsapp_messages(message_sid);

-- 2. ÍNDICE COMPOSTO PARA PERFORMANCE (conversa + data)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_created 
ON whatsapp_messages(conversation_id, created_at DESC);

-- 3. CONSTRAINT PARA FORMATO DE TELEFONE (básico)
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT IF NOT EXISTS check_phone_format 
CHECK (phone ~ '^\+[1-9]\d{1,14}$');

-- 4. CONSTRAINT PARA BODY OU MEDIA (pelo menos um deve existir)
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT IF NOT EXISTS check_body_or_media 
CHECK (body IS NOT NULL OR (raw_payload->>'NumMedia')::int > 0);

-- =====================================================
-- AJUSTES CONCLUÍDOS
-- =====================================================
