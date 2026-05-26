-- CreateTable
CREATE TABLE "pet_homologations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "region" VARCHAR(100),
    "vehicle_model" VARCHAR(100),
    "vehicle_year" VARCHAR(10),
    "four_doors" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(30) NOT NULL DEFAULT 'NOVO',
    "operator_id" UUID,
    "assigned_at" TIMESTAMPTZ,
    "assigned_by" UUID,
    "videos_sent_at" TIMESTAMPTZ,
    "quiz_sent_at" TIMESTAMPTZ,
    "quiz_score" INTEGER,
    "quiz_passed" BOOLEAN,
    "photos_sent_at" TIMESTAMPTZ,
    "photos_approved" BOOLEAN,
    "approved_at" TIMESTAMPTZ,
    "approved_by" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "notes" TEXT,
    "source" VARCHAR(30) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "pet_homologations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_homologation_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "homologation_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "admin_id" UUID NOT NULL,
    "admin_name" VARCHAR(255),
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30),
    "old_operator_id" UUID,
    "new_operator_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "pet_homologation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pet_homologations_status" ON "pet_homologations"("status");
CREATE INDEX "idx_pet_homologations_operator" ON "pet_homologations"("operator_id");
CREATE INDEX "idx_pet_homologation_logs_homologation" ON "pet_homologation_logs"("homologation_id");
CREATE INDEX "idx_pet_homologation_logs_admin" ON "pet_homologation_logs"("admin_id");

-- AddForeignKey
ALTER TABLE "pet_homologation_logs" ADD CONSTRAINT "pet_homologation_logs_homologation_id_fkey" FOREIGN KEY ("homologation_id") REFERENCES "pet_homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
