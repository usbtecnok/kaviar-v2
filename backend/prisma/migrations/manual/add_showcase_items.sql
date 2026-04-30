-- Vitrine Local KAVIAR — showcase_items
CREATE TABLE IF NOT EXISTS "showcase_items" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏪',
    "type" TEXT NOT NULL DEFAULT 'commerce',
    "community_id" TEXT,
    "neighborhood_id" TEXT,
    "cta_label" TEXT NOT NULL,
    "cta_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "showcase_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "showcase_items_is_active_community_id_idx" ON "showcase_items"("is_active", "community_id");
CREATE INDEX "showcase_items_is_active_neighborhood_id_idx" ON "showcase_items"("is_active", "neighborhood_id");
