-- Add explicit municipal modality to regulatory driver protocols.
-- Nullable to preserve historical records without silent backfill.
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD COLUMN "service_modality" "MunicipalServiceModality";

CREATE INDEX "municipal_regulatory_driver_protocols_case_id_service_modality_idx"
ON "municipal_regulatory_driver_protocols"("case_id", "service_modality");
