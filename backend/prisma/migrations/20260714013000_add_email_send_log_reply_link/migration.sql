ALTER TABLE "email_send_logs"
ADD COLUMN "reply_to_inbound_email_id" UUID;

ALTER TABLE "email_send_logs"
ADD CONSTRAINT "email_send_logs_reply_to_inbound_email_id_fkey"
FOREIGN KEY ("reply_to_inbound_email_id")
REFERENCES "inbound_email_messages"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "email_send_logs_reply_to_inbound_email_id_idx"
ON "email_send_logs"("reply_to_inbound_email_id");
