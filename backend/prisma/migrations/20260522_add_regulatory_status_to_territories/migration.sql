-- Status Regulatório por Território
-- Migration aditiva: 4 colunas opcionais em operational_territories

ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS regulatory_status VARCHAR(40) DEFAULT 'not_evaluated';
ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS regulatory_notes TEXT;
ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS regulatory_checked_at TIMESTAMPTZ;
ALTER TABLE operational_territories ADD COLUMN IF NOT EXISTS regulatory_checked_by VARCHAR(255);
