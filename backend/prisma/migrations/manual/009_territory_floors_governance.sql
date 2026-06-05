-- =====================================================================
-- Migration 009: territory_price_floors — Governança (Fase 2A)
--
-- Adiciona campos de workflow de aprovação à tabela existente.
-- Registros existentes (65 da Zona Sul) continuam como status = 'active'.
--
-- IMPACTO NOS DADOS EXISTENTES:
--   - status DEFAULT 'active' → todos os 65 registros continuam ativos
--   - version DEFAULT 1 → todos recebem versão 1
--   - Campos nullable (submitted_by, reviewed_by, etc.) → ficam NULL
--   - Nenhum registro é desativado ou alterado
--
-- ROLLBACK:
--   ALTER TABLE territory_price_floors
--     DROP COLUMN IF EXISTS status,
--     DROP COLUMN IF EXISTS submitted_by,
--     DROP COLUMN IF EXISTS reviewed_by,
--     DROP COLUMN IF EXISTS reviewed_at,
--     DROP COLUMN IF EXISTS review_reason,
--     DROP COLUMN IF EXISTS version;
-- =====================================================================

-- Workflow de aprovação
ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS submitted_by TEXT;

ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS review_reason TEXT;

ALTER TABLE territory_price_floors
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Constraint: status deve ser um dos valores válidos
ALTER TABLE territory_price_floors
  ADD CONSTRAINT chk_tpf_status
  CHECK (status IN ('active', 'draft', 'pending_approval', 'rejected', 'archived'));

-- Índice para lookup de propostas pendentes (SUPER_ADMIN approval queue)
CREATE INDEX IF NOT EXISTS idx_tpf_pending_approval
  ON territory_price_floors (status, territory_id)
  WHERE status = 'pending_approval';

-- Índice para busca por status ativo (usado no pricing-engine)
-- Complementa o idx_tpf_origin_dest existente
CREATE INDEX IF NOT EXISTS idx_tpf_active_status
  ON territory_price_floors (origin_neighborhood_id, dest_neighborhood_id, status)
  WHERE is_active = true AND status = 'active';
