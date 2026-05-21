-- CreateTable: operational_territories
CREATE TABLE "operational_territories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "parent_id" TEXT,
    "center_lat" DECIMAL(10,8),
    "center_lng" DECIMAL(11,8),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_territories_name_level_parent_id_key" ON "operational_territories"("name", "level", "parent_id");
CREATE INDEX "operational_territories_level_idx" ON "operational_territories"("level");
CREATE INDEX "operational_territories_parent_id_idx" ON "operational_territories"("parent_id");

-- AddForeignKey (self-reference)
ALTER TABLE "operational_territories" ADD CONSTRAINT "operational_territories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "operational_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: neighborhoods - add territory_id
ALTER TABLE "neighborhoods" ADD COLUMN "territory_id" TEXT;
CREATE INDEX "idx_neighborhoods_territory" ON "neighborhoods"("territory_id");
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: territorial_partners - add territory_id
ALTER TABLE "territorial_partners" ADD COLUMN "territory_id" TEXT;
CREATE INDEX "idx_territorial_partners_territory" ON "territorial_partners"("territory_id");
ALTER TABLE "territorial_partners" ADD CONSTRAINT "territorial_partners_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: Rio de Janeiro state territory (idempotent)
INSERT INTO "operational_territories" ("id", "name", "level", "parent_id", "center_lat", "center_lng", "is_active", "created_at", "updated_at")
SELECT 'territory-rj-state', 'Rio de Janeiro', 'state', NULL, -22.90685000, -43.17290000, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "operational_territories" WHERE "id" = 'territory-rj-state');

-- Seed: Rio de Janeiro city territory (idempotent)
INSERT INTO "operational_territories" ("id", "name", "level", "parent_id", "center_lat", "center_lng", "is_active", "created_at", "updated_at")
SELECT 'territory-rj-city', 'Rio de Janeiro', 'city', 'territory-rj-state', -22.90685000, -43.17290000, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "operational_territories" WHERE "id" = 'territory-rj-city');

-- Link existing neighborhoods (all are Rio de Janeiro) to territory
UPDATE "neighborhoods" SET "territory_id" = 'territory-rj-city' WHERE "city" = 'Rio de Janeiro' AND "territory_id" IS NULL;

-- Link existing territorial_partners to territory (all current partners are RJ)
UPDATE "territorial_partners" SET "territory_id" = 'territory-rj-city' WHERE "territory_id" IS NULL;
