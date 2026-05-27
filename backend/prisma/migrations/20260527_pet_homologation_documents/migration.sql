CREATE TABLE "pet_homologation_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "homologation_id" UUID NOT NULL,
  "wa_message_id" UUID,
  "original_media_url" TEXT,
  "s3_key" VARCHAR(500) NOT NULL,
  "file_name" VARCHAR(255),
  "mime_type" VARCHAR(50),
  "document_type" VARCHAR(50) NOT NULL DEFAULT 'outro',
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "created_by_admin_id" UUID,
  "created_by_admin_name" VARCHAR(255),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "approved_by_admin_id" UUID,
  "approved_at" TIMESTAMP,
  "rejected_by_admin_id" UUID,
  "rejected_at" TIMESTAMP,
  "rejection_reason" TEXT,
  "retention_until" TIMESTAMP,
  "is_hidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "hidden_at" TIMESTAMP,
  "hidden_by_admin_id" UUID,
  "hide_reason" TEXT
);

CREATE INDEX "idx_pet_homologation_docs_homologation" ON "pet_homologation_documents"("homologation_id");
CREATE INDEX "idx_pet_homologation_docs_status" ON "pet_homologation_documents"("status");
