CREATE TABLE "inbound_email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_email" VARCHAR(255) NOT NULL,
    "from_name" VARCHAR(255),
    "to_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "text_body" TEXT,
    "html_body" TEXT,
    "normalized_body" TEXT,
    "message_id" VARCHAR(255),
    "in_reply_to" VARCHAR(255),
    "references_header" TEXT,
    "provider" VARCHAR(64) NOT NULL DEFAULT 'CLOUDFLARE_EMAIL_WORKER',
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "has_attachments" BOOLEAN NOT NULL DEFAULT false,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "attachments_metadata" JSONB,
    "raw_headers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_email_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inbound_email_messages_status_check" CHECK ("status" IN ('NEW', 'READ', 'ARCHIVED'))
);

CREATE UNIQUE INDEX "inbound_email_messages_message_id_key" ON "inbound_email_messages"("message_id");
CREATE INDEX "inbound_email_messages_received_at_idx" ON "inbound_email_messages"("received_at");
CREATE INDEX "inbound_email_messages_status_received_at_idx" ON "inbound_email_messages"("status", "received_at");
CREATE INDEX "inbound_email_messages_to_email_received_at_idx" ON "inbound_email_messages"("to_email", "received_at");
CREATE INDEX "inbound_email_messages_from_email_received_at_idx" ON "inbound_email_messages"("from_email", "received_at");
