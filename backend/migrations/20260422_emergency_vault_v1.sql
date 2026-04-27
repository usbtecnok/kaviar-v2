-- Emergency Vault V1: Cofre de Evidência
-- Migration: add ride_emergency_events + emergency_location_trail

CREATE TABLE IF NOT EXISTS "ride_emergency_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ride_id" TEXT NOT NULL,
    "triggered_by_type" TEXT NOT NULL,
    "triggered_by_id" TEXT NOT NULL,
    "trigger_source" TEXT NOT NULL DEFAULT 'emergency_button',
    "status" TEXT NOT NULL DEFAULT 'active',
    "snapshot" JSONB NOT NULL,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_emergency_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "emergency_location_trail" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "emergency_event_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "speed" DECIMAL(5,2),
    "heading" DECIMAL(5,2),
    "captured_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_location_trail_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "ride_emergency_events_ride_id_idx" ON "ride_emergency_events"("ride_id");
CREATE INDEX IF NOT EXISTS "ride_emergency_events_status_idx" ON "ride_emergency_events"("status");
CREATE INDEX IF NOT EXISTS "ride_emergency_events_created_at_idx" ON "ride_emergency_events"("created_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "emergency_location_trail_event_captured_key" ON "emergency_location_trail"("emergency_event_id", "captured_at");
CREATE INDEX IF NOT EXISTS "emergency_location_trail_event_captured_idx" ON "emergency_location_trail"("emergency_event_id", "captured_at");

-- Foreign keys
ALTER TABLE "ride_emergency_events" ADD CONSTRAINT "ride_emergency_events_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides_v2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "emergency_location_trail" ADD CONSTRAINT "emergency_location_trail_emergency_event_id_fkey" FOREIGN KEY ("emergency_event_id") REFERENCES "ride_emergency_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Feature flag (disabled by default)
INSERT INTO "feature_flags" ("key", "enabled", "rollout_percentage", "created_at", "updated_at")
VALUES ('emergency_vault', false, 0, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
