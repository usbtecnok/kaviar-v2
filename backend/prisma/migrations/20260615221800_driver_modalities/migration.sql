-- CreateTable: driver_modalities
CREATE TABLE "driver_modalities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "driver_id" TEXT NOT NULL,
  "modality" VARCHAR(30) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW',
  "vehicle_plate" VARCHAR(10),
  "vehicle_model" VARCHAR(100),
  "vehicle_color" VARCHAR(30),
  "vehicle_year" INTEGER,
  "vehicle_brand" VARCHAR(50),
  "has_extra_helmet" BOOLEAN DEFAULT false,
  "cnh_category" VARCHAR(5),
  "reviewed_at" TIMESTAMPTZ,
  "reviewed_by" TEXT,
  "review_notes" TEXT,
  "rejected_reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "driver_modalities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "driver_modalities_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE,
  CONSTRAINT "driver_modalities_driver_id_modality_key" UNIQUE ("driver_id", "modality")
);

CREATE INDEX "idx_driver_modalities_driver" ON "driver_modalities"("driver_id");
CREATE INDEX "idx_driver_modalities_status" ON "driver_modalities"("status");
CREATE INDEX "idx_driver_modalities_modality_status" ON "driver_modalities"("modality", "status");

-- Seed: migrate existing drivers into driver_modalities
INSERT INTO "driver_modalities" ("driver_id", "modality", "status", "vehicle_plate", "vehicle_model", "vehicle_color")
SELECT
  d.id,
  CASE WHEN d.vehicle_type = 'MOTORCYCLE' THEN 'MOTO_DELIVERY' ELSE 'CAR' END,
  CASE
    WHEN d.status IN ('approved', 'active') THEN 'APPROVED'
    WHEN d.status = 'rejected' THEN 'REJECTED'
    ELSE 'PENDING_REVIEW'
  END,
  d.vehicle_plate,
  d.vehicle_model,
  d.vehicle_color
FROM "drivers" d
WHERE d.deleted_at IS NULL;
