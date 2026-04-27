-- Migration: move DDL from server.ts startup to proper migration
-- These tables were previously created via $executeRawUnsafe on every server start.

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- admin_login_history
CREATE TABLE IF NOT EXISTS admin_login_history (
  id SERIAL PRIMARY KEY,
  admin_id TEXT,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  fail_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_login_email ON admin_login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_created_at ON admin_login_history(created_at);

-- Feature flag seed
INSERT INTO feature_flags (key, enabled, rollout_percentage, updated_at, created_at)
VALUES ('passenger_favorites_matching', true, 100, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
