CREATE TABLE IF NOT EXISTS "private_ride_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "service_type" TEXT NOT NULL DEFAULT 'outro',
    "scheduled_date" TEXT NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "round_trip" BOOLEAN NOT NULL DEFAULT false,
    "wait_at_destination" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_driver" TEXT,
    "admin_notes" TEXT,
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "private_ride_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "private_ride_requests_status_idx" ON "private_ride_requests"("status");
CREATE INDEX IF NOT EXISTS "private_ride_requests_scheduled_date_idx" ON "private_ride_requests"("scheduled_date");
CREATE INDEX IF NOT EXISTS "private_ride_requests_partner_id_idx" ON "private_ride_requests"("partner_id");
