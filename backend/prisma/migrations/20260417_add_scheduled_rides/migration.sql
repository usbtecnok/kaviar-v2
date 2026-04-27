-- Add scheduled ride support
ALTER TYPE "RideStatus" ADD VALUE IF NOT EXISTS 'scheduled' BEFORE 'requested';
ALTER TABLE rides_v2 ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_rides_v2_scheduled ON rides_v2(scheduled_for) WHERE status = 'scheduled';
