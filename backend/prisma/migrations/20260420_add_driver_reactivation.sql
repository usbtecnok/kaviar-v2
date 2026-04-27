ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_reactivation_sent_at TIMESTAMPTZ;
