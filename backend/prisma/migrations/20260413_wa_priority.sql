ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'normal';
CREATE INDEX IF NOT EXISTS idx_wa_conv_priority ON wa_conversations(priority) WHERE priority = 'urgent';
