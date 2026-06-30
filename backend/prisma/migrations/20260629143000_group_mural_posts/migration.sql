-- Fase 2.2: Mural do Grupo KAVIAR
-- Migração aditiva, sem impacto em dispatch/rides_v2/preço.

CREATE TABLE IF NOT EXISTS kaviar_group_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES kaviar_groups(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL,
  author_admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
  author_member_id TEXT REFERENCES kaviar_group_members(id) ON DELETE SET NULL,
  author_display_name_snapshot VARCHAR(160),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'published',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kaviar_group_post_reads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL REFERENCES kaviar_group_posts(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES kaviar_group_members(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kaviar_group_post_reads_post_member_unique UNIQUE (post_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_posts_group_status_pinned_published
  ON kaviar_group_posts(group_id, status, is_pinned, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_posts_group_status_expires
  ON kaviar_group_posts(group_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_posts_author_admin
  ON kaviar_group_posts(author_admin_id);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_posts_author_member
  ON kaviar_group_posts(author_member_id);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_post_reads_post_id
  ON kaviar_group_post_reads(post_id);

CREATE INDEX IF NOT EXISTS idx_kaviar_group_post_reads_member_id
  ON kaviar_group_post_reads(member_id);
