-- CreateTable
CREATE TABLE "crm_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "business_name" VARCHAR(255),
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "lead_type" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    "status" VARCHAR(30) NOT NULL DEFAULT 'NEW',
    "source" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    "business_category" VARCHAR(50),
    "business_address" TEXT,
    "contact_person" VARCHAR(255),
    "wants_showcase" BOOLEAN,
    "wants_delivery_support" BOOLEAN,
    "wants_partnership" BOOLEAN,
    "wants_ads" BOOLEAN,
    "commercial_notes" TEXT,
    "territory_id" UUID,
    "neighborhood_id" TEXT,
    "assigned_admin_id" TEXT,
    "related_driver_id" TEXT,
    "related_passenger_id" TEXT,
    "related_partner_id" UUID,
    "related_private_ride_id" UUID,
    "related_pet_homologation_id" UUID,
    "related_showcase_item_id" UUID,
    "notes" TEXT,
    "next_action" VARCHAR(500),
    "next_action_at" TIMESTAMPTZ,
    "last_contact_at" TIMESTAMPTZ,
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "old_status" VARCHAR(30),
    "new_status" VARCHAR(30),
    "created_by_admin_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_crm_leads_status" ON "crm_leads"("status");

-- CreateIndex
CREATE INDEX "idx_crm_leads_lead_type" ON "crm_leads"("lead_type");

-- CreateIndex
CREATE INDEX "idx_crm_leads_territory" ON "crm_leads"("territory_id");

-- CreateIndex
CREATE INDEX "idx_crm_leads_assigned" ON "crm_leads"("assigned_admin_id");

-- CreateIndex
CREATE INDEX "idx_crm_leads_next_action" ON "crm_leads"("next_action_at");

-- CreateIndex
CREATE INDEX "idx_crm_interactions_lead" ON "crm_interactions"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_crm_interactions_admin" ON "crm_interactions"("created_by_admin_id");

-- AddForeignKey
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
