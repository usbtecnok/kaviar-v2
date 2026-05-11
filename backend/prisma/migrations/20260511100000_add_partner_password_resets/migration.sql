CREATE TABLE IF NOT EXISTS "partner_password_resets" (
    "id" TEXT NOT NULL,
    "partner_user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_ip" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "partner_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "partner_password_resets_partner_user_id_idx" ON "partner_password_resets"("partner_user_id");
CREATE INDEX IF NOT EXISTS "partner_password_resets_expires_at_idx" ON "partner_password_resets"("expires_at");

ALTER TABLE "partner_password_resets" DROP CONSTRAINT IF EXISTS "partner_password_resets_partner_user_id_fkey";
ALTER TABLE "partner_password_resets" ADD CONSTRAINT "partner_password_resets_partner_user_id_fkey" FOREIGN KEY ("partner_user_id") REFERENCES "partner_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add phone to partner_users
ALTER TABLE "partner_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

GRANT SELECT, INSERT, UPDATE, DELETE ON "partner_password_resets" TO kaviar_app;
