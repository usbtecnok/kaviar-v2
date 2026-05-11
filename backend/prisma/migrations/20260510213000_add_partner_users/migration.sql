CREATE TABLE IF NOT EXISTS "partner_users" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_users_email_key" ON "partner_users"("email");
CREATE INDEX IF NOT EXISTS "partner_users_partner_id_idx" ON "partner_users"("partner_id");
ALTER TABLE "partner_users" DROP CONSTRAINT IF EXISTS "partner_users_partner_id_fkey";
ALTER TABLE "partner_users" ADD CONSTRAINT "partner_users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "territorial_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON "partner_users" TO kaviar_app;
