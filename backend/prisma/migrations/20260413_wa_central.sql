-- Central WhatsApp KAVIAR — V1
-- Conversas e mensagens para atendimento manual via Twilio

-- 1. Conversas (1 por telefone)
CREATE TABLE wa_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               VARCHAR(20) NOT NULL UNIQUE,

  -- Identificação do contato
  contact_name        VARCHAR(255),
  whatsapp_name       VARCHAR(255),
  contact_type        VARCHAR(30) NOT NULL DEFAULT 'unknown',
  -- valores: driver | passenger | guide | consultant | lead | support | unknown

  -- Vínculo com entidade do sistema (opcional)
  linked_entity_type  VARCHAR(30),
  -- valores: driver | passenger | guide | consultant_lead | NULL
  linked_entity_id    VARCHAR(255),

  -- Operação
  status              VARCHAR(20) NOT NULL DEFAULT 'new',
  -- valores: new | in_progress | awaiting_reply | resolved | spam
  assignee_id         UUID,

  -- Contadores desnormalizados
  unread_count        INT NOT NULL DEFAULT 0,
  message_count       INT NOT NULL DEFAULT 0,
  last_message_at     TIMESTAMPTZ,
  last_message_preview VARCHAR(200),
  last_inbound_at     TIMESTAMPTZ,

  -- Notas internas
  internal_notes      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_conv_phone ON wa_conversations(phone);
CREATE INDEX idx_wa_conv_status ON wa_conversations(status);
CREATE INDEX idx_wa_conv_type ON wa_conversations(contact_type);
CREATE INDEX idx_wa_conv_last_msg ON wa_conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_wa_conv_unread ON wa_conversations(unread_count DESC) WHERE unread_count > 0;

-- 2. Mensagens
CREATE TABLE wa_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,

  direction           VARCHAR(10) NOT NULL,
  -- valores: inbound | outbound
  body                TEXT NOT NULL,

  -- Twilio
  twilio_sid          VARCHAR(50),
  media_url           TEXT,
  media_type          VARCHAR(50),

  -- Outbound: quem enviou
  sent_by_admin_id    UUID,
  sent_by_admin_name  VARCHAR(255),

  -- Delivery (outbound)
  delivery_status     VARCHAR(20) DEFAULT 'sent',
  -- valores: sent | delivered | read | failed

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msg_conv ON wa_messages(conversation_id, created_at);
CREATE INDEX idx_wa_msg_twilio ON wa_messages(twilio_sid) WHERE twilio_sid IS NOT NULL;
