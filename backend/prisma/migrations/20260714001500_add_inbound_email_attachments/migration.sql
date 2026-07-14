CREATE TABLE "inbound_email_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inbound_email_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(255) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_email_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inbound_email_attachments_storage_key_key" ON "inbound_email_attachments"("storage_key");
CREATE INDEX "inbound_email_attachments_inbound_email_id_idx" ON "inbound_email_attachments"("inbound_email_id");
CREATE INDEX "inbound_email_attachments_inbound_email_id_status_idx" ON "inbound_email_attachments"("inbound_email_id", "status");

ALTER TABLE "inbound_email_attachments"
ADD CONSTRAINT "inbound_email_attachments_inbound_email_id_fkey"
FOREIGN KEY ("inbound_email_id") REFERENCES "inbound_email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;