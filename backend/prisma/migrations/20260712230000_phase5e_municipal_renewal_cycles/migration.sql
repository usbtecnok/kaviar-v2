-- Fase 5E: ciclos de renovacao municipal com historico
-- Objetivo: permitir multiplos ciclos de protocolo/autorizacao sem sobrescrita destrutiva.

-- 1) Campos de ciclo em protocolos (historico legado permanece: cycle=1, renewal_of=null)
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD COLUMN IF NOT EXISTS "cycle_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "renewal_of_protocol_id" UUID;

-- 2) Campo de source em autorizacoes (legado permanece null)
ALTER TABLE "municipal_authorizations"
ADD COLUMN IF NOT EXISTS "source_driver_protocol_id" UUID;

-- 3) Remocao das unicidades que impedem historico natural
DROP INDEX IF EXISTS "municipal_regulatory_driver_protocols_case_id_driver_id_key";
DROP INDEX IF EXISTS "municipal_authorizations_driver_city_state_modality_key";

-- 4) Nova unicidade por ciclo de protocolo
CREATE UNIQUE INDEX IF NOT EXISTS "municipal_regulatory_driver_protocols_case_driver_modality_cycle_key"
ON "municipal_regulatory_driver_protocols"("case_id", "driver_id", "service_modality", "cycle_number");

-- Para service_modality nula, unique normal permite multiplos NULLs; este parcial fecha a brecha para protocolos vinculados.
CREATE UNIQUE INDEX IF NOT EXISTS "municipal_regulatory_driver_protocols_case_driver_null_modality_cycle_key"
ON "municipal_regulatory_driver_protocols"("case_id", "driver_id", "cycle_number")
WHERE "driver_id" IS NOT NULL
  AND "service_modality" IS NULL;

-- 5) Chave de idempotencia por autorizacao originada de protocolo especifico
CREATE UNIQUE INDEX IF NOT EXISTS "municipal_authorizations_source_driver_protocol_id_key"
ON "municipal_authorizations"("source_driver_protocol_id");

-- Garante no maximo um draft manual aberto por tuple, sem bloquear historico de ciclos/decisoes.
CREATE UNIQUE INDEX IF NOT EXISTS "municipal_authorizations_open_manual_draft_key"
ON "municipal_authorizations"("driver_id", "city", "state", "service_modality")
WHERE "source_driver_protocol_id" IS NULL
  AND "status" IN (
    'DOCUMENTS_PENDING'::"DriverMunicipalAuthorizationStatus",
    'IN_REVIEW_BY_KAVIAR'::"DriverMunicipalAuthorizationStatus",
    'READY_FOR_CITY_HALL'::"DriverMunicipalAuthorizationStatus"
  );

-- 6) Indices auxiliares de consulta operacional/historico
CREATE INDEX IF NOT EXISTS "municipal_regulatory_driver_protocols_renewal_of_protocol_id_idx"
ON "municipal_regulatory_driver_protocols"("renewal_of_protocol_id");

CREATE INDEX IF NOT EXISTS "municipal_regulatory_driver_protocols_case_driver_modality_idx"
ON "municipal_regulatory_driver_protocols"("case_id", "driver_id", "service_modality");

CREATE INDEX IF NOT EXISTS "municipal_authorizations_driver_city_state_modality_idx"
ON "municipal_authorizations"("driver_id", "city", "state", "service_modality");

-- 7) FKs com ON DELETE SET NULL para preservar historico
DO $$
BEGIN
  ALTER TABLE "municipal_regulatory_driver_protocols"
    ADD CONSTRAINT "municipal_regulatory_driver_protocols_renewal_of_protocol_id_fkey"
    FOREIGN KEY ("renewal_of_protocol_id") REFERENCES "municipal_regulatory_driver_protocols"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "municipal_authorizations"
    ADD CONSTRAINT "municipal_authorizations_source_driver_protocol_id_fkey"
    FOREIGN KEY ("source_driver_protocol_id") REFERENCES "municipal_regulatory_driver_protocols"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
