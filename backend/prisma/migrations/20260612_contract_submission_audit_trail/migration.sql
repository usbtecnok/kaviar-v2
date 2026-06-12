-- Fase 1: Trilha de auditoria na submissão de contrato
-- Adiciona campos de evidência da assinatura/submissão pela gestora territorial

ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS signer_name TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS signer_email TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS signer_document TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS signer_ip TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS document_hash TEXT;
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS contract_version VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE contract_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contract_submissions_document_hash ON contract_submissions(document_hash);
