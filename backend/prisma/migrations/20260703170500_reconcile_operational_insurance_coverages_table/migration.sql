CREATE TABLE IF NOT EXISTS operational_insurance_coverages (
  id text PRIMARY KEY,
  territory_id text,
  modality varchar(30) NOT NULL,
  provider_name varchar(200) NOT NULL,
  policy_number varchar(120) NOT NULL,
  coverage_type varchar(30) NOT NULL,
  coverage_description text,
  coverage_amount_death numeric(12,2),
  coverage_amount_disability numeric(12,2),
  coverage_amount_medical numeric(12,2),
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  document_url text,
  notes text,
  created_by_admin_id text,
  updated_by_admin_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operational_insurance_coverages_modality_check
    CHECK (modality IN ('CAR_PASSENGER', 'MOTO_PASSENGER', 'MOTO_DELIVERY')),
  CONSTRAINT operational_insurance_coverages_coverage_type_check
    CHECK (coverage_type IN ('APP', 'RC_F', 'PERSONAL_ACCIDENT', 'CARGO', 'OTHER')),
  CONSTRAINT operational_insurance_coverages_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED')),
  CONSTRAINT operational_insurance_coverages_territory_fk
    FOREIGN KEY (territory_id) REFERENCES operational_territories(id) ON DELETE SET NULL,
  CONSTRAINT operational_insurance_coverages_created_by_admin_fk
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT operational_insurance_coverages_updated_by_admin_fk
    FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_operational_insurance_coverages_territory
  ON operational_insurance_coverages (territory_id);

CREATE INDEX IF NOT EXISTS idx_operational_insurance_coverages_modality
  ON operational_insurance_coverages (modality);

CREATE INDEX IF NOT EXISTS idx_operational_insurance_coverages_status
  ON operational_insurance_coverages (status);

CREATE INDEX IF NOT EXISTS idx_operational_insurance_coverages_valid_until
  ON operational_insurance_coverages (valid_until);

CREATE OR REPLACE FUNCTION trg_set_updated_at_operational_insurance_coverages()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_operational_insurance_coverages ON operational_insurance_coverages;
CREATE TRIGGER set_updated_at_operational_insurance_coverages
BEFORE UPDATE ON operational_insurance_coverages
FOR EACH ROW
EXECUTE FUNCTION trg_set_updated_at_operational_insurance_coverages();