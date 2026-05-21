-- Add status, uf, city_name, notes to operational_territories
ALTER TABLE "operational_territories" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "operational_territories" ADD COLUMN "uf" TEXT;
ALTER TABLE "operational_territories" ADD COLUMN "city_name" TEXT;
ALTER TABLE "operational_territories" ADD COLUMN "notes" TEXT;

CREATE INDEX "idx_operational_territories_status" ON "operational_territories"("status");

-- Update existing territories
UPDATE "operational_territories" SET status = 'active', uf = 'RJ' WHERE id = 'territory-rj-state';
UPDATE "operational_territories" SET status = 'active', uf = 'RJ', city_name = 'Rio de Janeiro' WHERE id = 'territory-rj-city';
