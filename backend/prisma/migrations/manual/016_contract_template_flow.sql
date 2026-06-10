-- =====================================================================
-- Migration 016: Contract Template Flow
--
-- Expands operator_profiles for template-based contract workflow.
-- Creates contract_submissions table for future gestora uploads.
-- Does NOT alter existing data or contract_status values.
--
-- PRE-CONDITION:
--   All existing contract_status values must be in the allowed list.
--   Verified in production: only 'pending' and 'signed' exist.
--
-- ROLLBACK (safe ONLY if no profiles use new states):
--   -- Pre-check before rollback:
--   -- SELECT DISTINCT contract_status FROM operator_profiles
--   --   WHERE contract_status NOT IN ('pending','signed','not_required');
--   -- Must return 0 rows. If not, DO NOT rollback.
--
--   DROP TABLE IF EXISTS contract_submissions;
--   ALTER TABLE operator_profiles DROP COLUMN IF EXISTS contract_template_url;
--   ALTER TABLE operator_profiles DROP COLUMN IF EXISTS contract_reviewed_by;
--   ALTER TABLE operator_profiles DROP COLUMN IF EXISTS contract_reviewed_at;
--   ALTER TABLE operator_profiles DROP COLUMN IF EXISTS contract_rejection_reason;
--   ALTER TABLE operator_profiles DROP CONSTRAINT IF EXISTS chk_op_contract_status;
--   ALTER TABLE operator_profiles ADD CONSTRAINT chk_op_contract_status
--     CHECK (contract_status IN ('pending','signed','not_required'));
-- =====================================================================

-- Step 1: Remove old constraint if exists (Prisma may not have created one)
ALTER TABLE operator_profiles DROP CONSTRAINT IF EXISTS operator_profiles_contract_status_check;
ALTER TABLE operator_profiles DROP CONSTRAINT IF EXISTS chk_op_contract_status;

-- Step 2: Create new constraint with all permitted values
ALTER TABLE operator_profiles ADD CONSTRAINT chk_op_contract_status
  CHECK (contract_status IN ('pending','available','submitted','in_review','approved','signed','rejected','not_required'));

-- Step 3: Add new columns
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_template_url TEXT;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_reviewed_by TEXT REFERENCES admins(id) ON DELETE RESTRICT;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_reviewed_at TIMESTAMPTZ;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_rejection_reason TEXT;

-- Step 4: Create contract_submissions table
CREATE TABLE IF NOT EXISTS contract_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_profile_id   TEXT NOT NULL REFERENCES operator_profiles(id) ON DELETE RESTRICT,
  submitted_by_admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  s3_key                TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','in_review','approved','rejected','superseded')),
  reviewed_by           TEXT REFERENCES admins(id) ON DELETE RESTRICT,
  reviewed_at           TIMESTAMPTZ,
  rejection_reason      TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_operator ON contract_submissions(operator_profile_id);
CREATE INDEX IF NOT EXISTS idx_cs_queue ON contract_submissions(status) WHERE status IN ('submitted','in_review');
CREATE INDEX IF NOT EXISTS idx_cs_created ON contract_submissions(created_at DESC);

-- At most one open submission per operator (submitted or in_review)
-- Use DO block to handle IF NOT EXISTS for unique index
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cs_one_open_per_operator') THEN
    CREATE UNIQUE INDEX idx_cs_one_open_per_operator
      ON contract_submissions(operator_profile_id)
      WHERE status IN ('submitted','in_review');
  END IF;
END $$;
