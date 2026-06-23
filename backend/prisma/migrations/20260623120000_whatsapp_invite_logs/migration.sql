CREATE TABLE IF NOT EXISTS "whatsapp_invite_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" TEXT NOT NULL,
  "admin_name" VARCHAR(255),
  "admin_email" VARCHAR(255),
  "admin_role" VARCHAR(50) NOT NULL,
  "territory_id" TEXT,
  "target_phone_normalized" VARCHAR(20) NOT NULL,
  "target_name" VARCHAR(255),
  "invite_type" VARCHAR(30) NOT NULL,
  "channel" VARCHAR(30) NOT NULL DEFAULT 'twilio_whatsapp',
  "template_key" VARCHAR(80) NOT NULL,
  "twilio_message_sid" VARCHAR(80),
  "twilio_status" VARCHAR(30),
  "twilio_error_code" VARCHAR(30),
  "twilio_error_message" TEXT,
  "duplicate_of_log_id" UUID,
  "source_screen" VARCHAR(80) NOT NULL DEFAULT 'whatsapp_central',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_invite_logs_twilio_message_sid_key" ON "whatsapp_invite_logs" ("twilio_message_sid") WHERE "twilio_message_sid" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "whatsapp_invite_logs_target_phone_normalized_invite_type_created_at_idx" ON "whatsapp_invite_logs" ("target_phone_normalized", "invite_type", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_invite_logs_admin_id_created_at_idx" ON "whatsapp_invite_logs" ("admin_id", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_invite_logs_territory_id_created_at_idx" ON "whatsapp_invite_logs" ("territory_id", "created_at");
