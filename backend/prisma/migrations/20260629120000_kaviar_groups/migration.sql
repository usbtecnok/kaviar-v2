-- Grupo KAVIAR / KAVIAR Comunidade backend base
-- Fase 1A: schema only. Dispatch and ride flows do not consume group_id yet.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS kaviar_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  public_name VARCHAR(120) NOT NULL,
  internal_name VARCHAR(160),
  type VARCHAR(40) NOT NULL DEFAULT 'private_group',
  responsible_name VARCHAR(160),
  responsible_phone VARCHAR(30),
  responsible_email VARCHAR(255),
  description VARCHAR(500),
  rules JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  community_id TEXT REFERENCES communities(id) ON DELETE SET NULL,
  neighborhood_id TEXT REFERENCES neighborhoods(id) ON DELETE SET NULL,
  territory_id TEXT REFERENCES operational_territories(id) ON DELETE SET NULL,
  created_by_admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kaviar_groups_type_check CHECK (type IN ('private_group','local_community','family','school','company','condo','elderly_support','other')),
  CONSTRAINT kaviar_groups_status_check CHECK (status IN ('draft','active','paused','archived'))
);

CREATE TABLE IF NOT EXISTS kaviar_group_invites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES kaviar_groups(id) ON DELETE CASCADE,
  code VARCHAR(40) NOT NULL UNIQUE,
  token_hash VARCHAR(128) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kaviar_group_invites_status_check CHECK (status IN ('active','revoked','expired')),
  CONSTRAINT kaviar_group_invites_max_uses_check CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT kaviar_group_invites_used_count_check CHECK (used_count >= 0)
);

CREATE TABLE IF NOT EXISTS kaviar_group_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES kaviar_groups(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL,
  passenger_id TEXT REFERENCES passengers(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES drivers(id) ON DELETE CASCADE,
  name VARCHAR(160),
  phone VARCHAR(30),
  role VARCHAR(30) NOT NULL DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  invite_id TEXT REFERENCES kaviar_group_invites(id) ON DELETE SET NULL,
  invite_source VARCHAR(40),
  consented_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kaviar_group_members_user_type_check CHECK (user_type IN ('passenger','driver','responsible')),
  CONSTRAINT kaviar_group_members_role_check CHECK (role IN ('member','responsible','trusted_driver')),
  CONSTRAINT kaviar_group_members_status_check CHECK (status IN ('pending','active','blocked','removed')),
  CONSTRAINT kaviar_group_members_identity_check CHECK (
    (user_type = 'passenger' AND passenger_id IS NOT NULL AND driver_id IS NULL)
    OR (user_type = 'driver' AND driver_id IS NOT NULL AND passenger_id IS NULL)
    OR (user_type = 'responsible' AND passenger_id IS NULL AND driver_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_kaviar_groups_status ON kaviar_groups(status);
CREATE INDEX IF NOT EXISTS idx_kaviar_groups_type ON kaviar_groups(type);
CREATE INDEX IF NOT EXISTS idx_kaviar_groups_community ON kaviar_groups(community_id);
CREATE INDEX IF NOT EXISTS idx_kaviar_groups_neighborhood ON kaviar_groups(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_kaviar_groups_territory ON kaviar_groups(territory_id);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_invites_group_status ON kaviar_group_invites(group_id, status);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_invites_expires ON kaviar_group_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_members_group_status ON kaviar_group_members(group_id, status);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_members_passenger ON kaviar_group_members(passenger_id);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_members_driver ON kaviar_group_members(driver_id);
CREATE INDEX IF NOT EXISTS idx_kaviar_group_members_invite ON kaviar_group_members(invite_id);
CREATE UNIQUE INDEX IF NOT EXISTS kaviar_group_members_group_passenger_unique ON kaviar_group_members(group_id, passenger_id) WHERE passenger_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kaviar_group_members_group_driver_unique ON kaviar_group_members(group_id, driver_id) WHERE driver_id IS NOT NULL;

ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS group_source TEXT;
CREATE INDEX IF NOT EXISTS idx_rides_v2_group_id ON rides_v2(group_id);
