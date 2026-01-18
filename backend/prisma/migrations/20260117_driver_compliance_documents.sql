-- CreateTable: driver_compliance_documents
-- Sistema de revalidação periódica de antecedentes criminais

CREATE TABLE IF NOT EXISTS driver_compliance_documents (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'criminal_record',
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejected_by TEXT,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  is_current BOOLEAN DEFAULT false,
  lgpd_consent_accepted BOOLEAN DEFAULT false,
  lgpd_consent_ip TEXT,
  lgpd_consent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES admins(id),
  CONSTRAINT fk_rejected_by FOREIGN KEY (rejected_by) REFERENCES admins(id)
);

-- Índices para performance
CREATE INDEX idx_driver_compliance_driver_id ON driver_compliance_documents(driver_id);
CREATE INDEX idx_driver_compliance_status ON driver_compliance_documents(status);
CREATE INDEX idx_driver_compliance_is_current ON driver_compliance_documents(is_current);
CREATE INDEX idx_driver_compliance_valid_until ON driver_compliance_documents(valid_until);

-- Constraint: apenas 1 documento vigente por motorista (partial unique index)
-- PostgreSQL suporta WHERE clause em unique index
CREATE UNIQUE INDEX idx_driver_compliance_current_unique 
ON driver_compliance_documents(driver_id) 
WHERE is_current = true;

COMMENT ON TABLE driver_compliance_documents IS 'Histórico versionado de documentos de compliance (antecedentes criminais) com revalidação periódica';
COMMENT ON COLUMN driver_compliance_documents.is_current IS 'Apenas 1 documento pode ser vigente por motorista (garantido por partial unique index)';
COMMENT ON COLUMN driver_compliance_documents.valid_until IS 'Data de vencimento (padrão: 12 meses após aprovação)';
