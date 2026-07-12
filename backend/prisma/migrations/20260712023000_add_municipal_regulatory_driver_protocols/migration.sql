-- CreateTable
CREATE TABLE "municipal_regulatory_driver_protocols" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "driver_name" TEXT NOT NULL,
    "cpf_last4" VARCHAR(4),
    "vehicle_plate" VARCHAR(16),
    "vehicle_type" VARCHAR(60),
    "protocol_number" VARCHAR(120),
    "status" VARCHAR(32) NOT NULL DEFAULT 'PREPARING',
    "next_action" TEXT,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipal_regulatory_driver_protocols_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD CONSTRAINT "municipal_regulatory_driver_protocols_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "municipal_regulatory_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD CONSTRAINT "municipal_regulatory_driver_protocols_status_check"
CHECK ("status" IN ('PREPARING', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_COMPLEMENT'));

-- AddCheckConstraint
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD CONSTRAINT "municipal_regulatory_driver_protocols_cpf_last4_check"
CHECK ("cpf_last4" IS NULL OR "cpf_last4" ~ '^[0-9]{1,4}$');

-- CreateIndex
CREATE INDEX "municipal_regulatory_driver_protocols_case_id_status_idx"
ON "municipal_regulatory_driver_protocols"("case_id", "status");

-- CreateIndex
CREATE INDEX "municipal_regulatory_driver_protocols_case_id_created_at_idx"
ON "municipal_regulatory_driver_protocols"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "municipal_regulatory_driver_protocols_next_follow_up_at_idx"
ON "municipal_regulatory_driver_protocols"("next_follow_up_at");

-- CreateIndex
CREATE INDEX "municipal_regulatory_driver_protocols_protocol_number_idx"
ON "municipal_regulatory_driver_protocols"("protocol_number");
