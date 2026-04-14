-- Add password_changed_at to drivers and passengers for token invalidation
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
