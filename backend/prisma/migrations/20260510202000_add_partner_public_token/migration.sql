ALTER TABLE "territorial_partners" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "territorial_partners_public_token_key" ON "territorial_partners"("public_token");

-- Generate token for Fazendinha
UPDATE "territorial_partners" SET "public_token" = encode(gen_random_bytes(16), 'hex') WHERE "referral_code" = 'FAZENDINHA' AND "public_token" IS NULL;
