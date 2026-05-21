-- Fase 7C: Termos, Contrato e LGPD do Operador Territorial
-- Migration aditiva (baixo risco): adiciona 5 colunas opcionais a operator_profiles

ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS confidentiality_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE operator_profiles ADD COLUMN IF NOT EXISTS terms_accepted_by VARCHAR(255);
