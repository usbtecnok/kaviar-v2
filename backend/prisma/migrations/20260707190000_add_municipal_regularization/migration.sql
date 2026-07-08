DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MunicipalServiceModality') THEN
    CREATE TYPE "MunicipalServiceModality" AS ENUM ('CAR', 'MOTO_PASSENGER', 'MOTO_DELIVERY', 'TAXI', 'VAN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MunicipalRegulationStatus') THEN
    CREATE TYPE "MunicipalRegulationStatus" AS ENUM ('REGULATED', 'NOT_REGULATED', 'UNKNOWN', 'REQUIRES_CONFIRMATION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DriverMunicipalAuthorizationStatus') THEN
    CREATE TYPE "DriverMunicipalAuthorizationStatus" AS ENUM (
      'NOT_STARTED',
      'DOCUMENTS_PENDING',
      'IN_REVIEW_BY_KAVIAR',
      'READY_FOR_CITY_HALL',
      'SUBMITTED_TO_CITY_HALL',
      'WAITING_CITY_HALL_REVIEW',
      'APPROVED_BY_CITY_HALL',
      'REJECTED_BY_CITY_HALL',
      'NEEDS_COMPLEMENT',
      'EXPIRED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MunicipalPackageAuditAction') THEN
    CREATE TYPE "MunicipalPackageAuditAction" AS ENUM ('GENERATED', 'DOWNLOADED', 'SUBMITTED', 'STATUS_CHANGED', 'PROTOCOL_UPDATED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "municipal_regulations" (
  "id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" VARCHAR(2) NOT NULL,
  "municipality_code" TEXT,
  "service_modality" "MunicipalServiceModality" NOT NULL,
  "regulation_status" "MunicipalRegulationStatus" NOT NULL DEFAULT 'UNKNOWN',
  "law_number" TEXT,
  "law_date" DATE,
  "law_document_url" TEXT,
  "requires_city_approval" BOOLEAN NOT NULL DEFAULT false,
  "requires_protocol" BOOLEAN NOT NULL DEFAULT false,
  "max_vehicle_age_years" INTEGER,
  "authorization_validity_months" INTEGER,
  "responsible_agency" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipal_regulations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "municipal_regulations_city_state_idx" ON "municipal_regulations"("city", "state");
CREATE INDEX IF NOT EXISTS "municipal_regulations_modality_active_idx" ON "municipal_regulations"("service_modality", "is_active");

CREATE TABLE IF NOT EXISTS "municipal_regulation_requirements" (
  "id" TEXT NOT NULL,
  "regulation_id" TEXT NOT NULL,
  "requirement_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "document_type" TEXT,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "applies_when" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipal_regulation_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "municipal_regulation_requirements_regulation_id_requirement_key_key"
  ON "municipal_regulation_requirements"("regulation_id", "requirement_key");
CREATE INDEX IF NOT EXISTS "municipal_regulation_requirements_regulation_id_sort_order_idx"
  ON "municipal_regulation_requirements"("regulation_id", "sort_order");

CREATE TABLE IF NOT EXISTS "municipal_authorizations" (
  "id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "regulation_id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" VARCHAR(2) NOT NULL,
  "service_modality" "MunicipalServiceModality" NOT NULL,
  "status" "DriverMunicipalAuthorizationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "protocol_number" TEXT,
  "protocol_date" DATE,
  "protocol_agency" TEXT,
  "protocol_responsible_name" TEXT,
  "protocol_receipt_url" TEXT,
  "city_hall_notes" TEXT,
  "authorization_number" TEXT,
  "authorization_document_url" TEXT,
  "authorization_valid_until" DATE,
  "municipal_package_url" TEXT,
  "submitted_by_admin_id" TEXT,
  "submitted_by_manager_id" TEXT,
  "approved_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipal_authorizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "municipal_authorizations_driver_city_state_modality_key"
  ON "municipal_authorizations"("driver_id", "city", "state", "service_modality");
CREATE INDEX IF NOT EXISTS "municipal_authorizations_driver_status_idx"
  ON "municipal_authorizations"("driver_id", "status");
CREATE INDEX IF NOT EXISTS "municipal_authorizations_city_state_modality_idx"
  ON "municipal_authorizations"("city", "state", "service_modality");

CREATE TABLE IF NOT EXISTS "municipal_package_audit_logs" (
  "id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "authorization_id" TEXT NOT NULL,
  "action" "MunicipalPackageAuditAction" NOT NULL,
  "actor_admin_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "municipal_package_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "municipal_package_audit_logs_driver_created_idx"
  ON "municipal_package_audit_logs"("driver_id", "created_at");
CREATE INDEX IF NOT EXISTS "municipal_package_audit_logs_authorization_created_idx"
  ON "municipal_package_audit_logs"("authorization_id", "created_at");

DO $$
BEGIN
  ALTER TABLE "municipal_regulation_requirements"
    ADD CONSTRAINT "municipal_regulation_requirements_regulation_id_fkey"
    FOREIGN KEY ("regulation_id") REFERENCES "municipal_regulations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_regulation_id_fkey"
    FOREIGN KEY ("regulation_id") REFERENCES "municipal_regulations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_submitted_by_admin_id_fkey"
    FOREIGN KEY ("submitted_by_admin_id") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_submitted_by_manager_id_fkey"
    FOREIGN KEY ("submitted_by_manager_id") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_approved_by_admin_id_fkey"
    FOREIGN KEY ("approved_by_admin_id") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_package_audit_logs"
    ADD CONSTRAINT "municipal_package_audit_logs_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_package_audit_logs"
    ADD CONSTRAINT "municipal_package_audit_logs_authorization_id_fkey"
    FOREIGN KEY ("authorization_id") REFERENCES "municipal_authorizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_package_audit_logs"
    ADD CONSTRAINT "municipal_package_audit_logs_actor_admin_id_fkey"
    FOREIGN KEY ("actor_admin_id") REFERENCES "admins"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at_municipal_regulations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_municipal_regulations ON municipal_regulations;
CREATE TRIGGER trg_set_updated_at_municipal_regulations
BEFORE UPDATE ON municipal_regulations
FOR EACH ROW EXECUTE FUNCTION set_updated_at_municipal_regulations();

CREATE OR REPLACE FUNCTION set_updated_at_municipal_regulation_requirements()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_municipal_regulation_requirements ON municipal_regulation_requirements;
CREATE TRIGGER trg_set_updated_at_municipal_regulation_requirements
BEFORE UPDATE ON municipal_regulation_requirements
FOR EACH ROW EXECUTE FUNCTION set_updated_at_municipal_regulation_requirements();

CREATE OR REPLACE FUNCTION set_updated_at_municipal_authorizations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_municipal_authorizations ON municipal_authorizations;
CREATE TRIGGER trg_set_updated_at_municipal_authorizations
BEFORE UPDATE ON municipal_authorizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at_municipal_authorizations();
