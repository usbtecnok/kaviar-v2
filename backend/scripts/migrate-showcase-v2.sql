-- Vitrine Local V2: Pacote de Exposições
-- Migration aditiva — segura para rodar em produção

-- Novos campos em showcase_items
ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS exposure_quota INT;
ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS exposure_used INT NOT NULL DEFAULT 0;
ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS clicks_count INT NOT NULL DEFAULT 0;
ALTER TABLE showcase_items ADD COLUMN IF NOT EXISTS last_shown_at TIMESTAMPTZ;

-- Nova tabela showcase_events
CREATE TABLE IF NOT EXISTS showcase_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  item_id TEXT NOT NULL,
  passenger_id TEXT NOT NULL,
  ride_id TEXT,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, passenger_id, ride_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_showcase_events_item_type ON showcase_events(item_id, event_type);
CREATE INDEX IF NOT EXISTS idx_showcase_events_item_created ON showcase_events(item_id, created_at);
