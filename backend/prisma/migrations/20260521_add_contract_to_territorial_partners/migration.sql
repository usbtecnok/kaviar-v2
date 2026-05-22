-- Contrato para Parceiro Territorial / Associação
-- Migration aditiva (baixo risco): adiciona 4 colunas opcionais a territorial_partners

ALTER TABLE territorial_partners ADD COLUMN IF NOT EXISTS contract_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE territorial_partners ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE territorial_partners ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE territorial_partners ADD COLUMN IF NOT EXISTS contract_notes TEXT;
