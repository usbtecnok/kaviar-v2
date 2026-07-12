-- CreateTable
CREATE TABLE "municipal_regulatory_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    "department_name" VARCHAR(255),
    "contact_name" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(40),
    "last_sent_at" TIMESTAMP(3),
    "last_response_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "next_action" TEXT,
    "notes" TEXT,
    "created_by_admin_id" UUID,
    "updated_by_admin_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipal_regulatory_cases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "municipal_regulatory_cases_status_check" CHECK ("status" IN (
      'NOT_STARTED',
      'CONTACTED',
      'WAITING_RESPONSE',
      'RESPONSE_RECEIVED',
      'DOCUMENTS_REQUESTED',
      'READY_TO_PROTOCOL',
      'PROTOCOL_SENT',
      'APPROVED',
      'REJECTED',
      'PAUSED'
    ))
);

-- CreateIndex
CREATE INDEX "municipal_regulatory_cases_status_updated_at_idx" ON "municipal_regulatory_cases"("status", "updated_at");

-- CreateIndex
CREATE INDEX "municipal_regulatory_cases_state_city_idx" ON "municipal_regulatory_cases"("state", "city");

-- CreateIndex
CREATE INDEX "municipal_regulatory_cases_next_follow_up_at_idx" ON "municipal_regulatory_cases"("next_follow_up_at");

-- CreateIndex
CREATE INDEX "municipal_regulatory_cases_created_at_idx" ON "municipal_regulatory_cases"("created_at");
