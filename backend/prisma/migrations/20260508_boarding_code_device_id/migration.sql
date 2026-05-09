-- Device identification for drivers
ALTER TABLE "drivers" ADD COLUMN "device_id" TEXT;
ALTER TABLE "drivers" ADD COLUMN "device_model" TEXT;

-- Boarding code for ride verification
ALTER TABLE "rides_v2" ADD COLUMN "boarding_code" TEXT;
