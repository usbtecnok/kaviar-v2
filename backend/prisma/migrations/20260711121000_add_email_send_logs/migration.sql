-- CreateTable
CREATE TABLE "email_send_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" TEXT NOT NULL,
    "admin_email" VARCHAR(255),
    "from_email" VARCHAR(255) NOT NULL,
    "from_name" VARCHAR(255),
    "to_email" VARCHAR(255) NOT NULL,
    "cc_email" VARCHAR(255),
    "subject" VARCHAR(180) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error_message" TEXT,
    "attachment_count" INTEGER NOT NULL DEFAULT 0,
    "attachments_metadata" JSONB,
    "provider_message_id" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_send_logs_created_at_idx" ON "email_send_logs"("created_at");

-- CreateIndex
CREATE INDEX "email_send_logs_status_created_at_idx" ON "email_send_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "email_send_logs_to_email_created_at_idx" ON "email_send_logs"("to_email", "created_at");

-- CreateIndex
CREATE INDEX "email_send_logs_from_email_created_at_idx" ON "email_send_logs"("from_email", "created_at");

-- CreateIndex
CREATE INDEX "email_send_logs_admin_id_created_at_idx" ON "email_send_logs"("admin_id", "created_at");

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
