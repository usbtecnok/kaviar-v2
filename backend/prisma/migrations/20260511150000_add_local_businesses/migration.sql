CREATE TABLE IF NOT EXISTS "local_businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outro',
    "description" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "region_slug" TEXT NOT NULL,
    "partner_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "local_businesses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "local_businesses_region_slug_is_active_idx" ON "local_businesses"("region_slug", "is_active");

-- Seed: comércios iniciais Alto da Boa Vista
INSERT INTO "local_businesses" ("id", "name", "category", "description", "region_slug")
SELECT gen_random_uuid()::text, 'Bar do Halfe', 'bar', 'Bar e petiscaria local', 'alto-da-boa-vista'
WHERE NOT EXISTS (SELECT 1 FROM "local_businesses" WHERE "name" = 'Bar do Halfe');

INSERT INTO "local_businesses" ("id", "name", "category", "description", "region_slug")
SELECT gen_random_uuid()::text, 'Mercearia da Rose', 'mercearia', 'Mercearia e conveniência', 'alto-da-boa-vista'
WHERE NOT EXISTS (SELECT 1 FROM "local_businesses" WHERE "name" = 'Mercearia da Rose');

INSERT INTO "local_businesses" ("id", "name", "category", "description", "region_slug")
SELECT gen_random_uuid()::text, 'Ateliê da Adriana', 'servicos', 'Ateliê de costura e artesanato', 'alto-da-boa-vista'
WHERE NOT EXISTS (SELECT 1 FROM "local_businesses" WHERE "name" = 'Ateliê da Adriana');

INSERT INTO "local_businesses" ("id", "name", "category", "description", "region_slug")
SELECT gen_random_uuid()::text, 'Quentinhas da Luciana', 'alimentacao', 'Marmitas e quentinhas caseiras', 'alto-da-boa-vista'
WHERE NOT EXISTS (SELECT 1 FROM "local_businesses" WHERE "name" = 'Quentinhas da Luciana');
