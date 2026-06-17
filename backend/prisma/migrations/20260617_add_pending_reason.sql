-- Add pending_reason field for needs_documents workflow
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pending_reason TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS pending_reason_updated_at TIMESTAMPTZ;
