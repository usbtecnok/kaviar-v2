-- Fase 2.4 Lote A: Convites de Responsável do Grupo
-- Migração aditiva e sem impacto em dispatch/rides_v2/preço/motorista.

CREATE TABLE IF NOT EXISTS kaviar_group_responsible_invites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES kaviar_groups(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  invited_by_admin_id TEXT,
  accepted_by_member_id TEXT,
  accepted_by_passenger_id TEXT,
  consent_text_version VARCHAR(50),
  consent_given_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kaviar_group_responsible_invites_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_responsible_invites_group_status
  ON kaviar_group_responsible_invites(group_id, status);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_responsible_invites_expires_at
  ON kaviar_group_responsible_invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_responsible_invites_invited_by_admin
  ON kaviar_group_responsible_invites(invited_by_admin_id);
