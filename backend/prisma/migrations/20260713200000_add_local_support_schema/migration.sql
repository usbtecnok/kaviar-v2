-- CreateTable
CREATE TABLE "local_support_drivers" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "community_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'interested',
    "primary_area" TEXT,
    "coverage_areas" JSONB,
    "preferred_windows" JSONB NOT NULL DEFAULT '{}',
    "pilot_start_date" TIMESTAMP(3),
    "operational_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_support_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_support_invites" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "community_id" TEXT,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "region" TEXT,
    "demand_type" TEXT NOT NULL DEFAULT 'normal',
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "response_time_minutes" INTEGER,
    "informed_availability" BOOLEAN NOT NULL DEFAULT false,
    "attended_ride" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "invited_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_support_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_support_drivers_driver_id_key" ON "local_support_drivers"("driver_id");

-- CreateIndex
CREATE INDEX "local_support_drivers_community_id_idx" ON "local_support_drivers"("community_id");

-- CreateIndex
CREATE INDEX "local_support_drivers_status_idx" ON "local_support_drivers"("status");

-- CreateIndex
CREATE INDEX "local_support_invites_driver_id_invited_at_idx" ON "local_support_invites"("driver_id", "invited_at" DESC);

-- CreateIndex
CREATE INDEX "local_support_invites_community_id_invited_at_idx" ON "local_support_invites"("community_id", "invited_at" DESC);

-- AddForeignKey
ALTER TABLE "local_support_drivers" ADD CONSTRAINT "local_support_drivers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_support_drivers" ADD CONSTRAINT "local_support_drivers_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_support_invites" ADD CONSTRAINT "local_support_invites_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "local_support_drivers"("driver_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_support_invites" ADD CONSTRAINT "local_support_invites_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
