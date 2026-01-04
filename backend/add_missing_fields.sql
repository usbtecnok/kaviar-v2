-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "auto_activation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "center_lat" DECIMAL(10,8),
ADD COLUMN     "center_lng" DECIMAL(11,8),
ADD COLUMN     "deactivation_threshold" INTEGER DEFAULT 1,
ADD COLUMN     "last_evaluated_at" TIMESTAMP(3),
ADD COLUMN     "min_active_drivers" INTEGER DEFAULT 3,
ADD COLUMN     "radius_meters" INTEGER;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "banned_at" TIMESTAMP(3),
ADD COLUMN     "banned_reason" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_lat" DECIMAL(10,8),
ADD COLUMN     "last_lng" DECIMAL(11,8),
ADD COLUMN     "last_location_updated_at" TIMESTAMP(3),
ADD COLUMN     "premium_override" BOOLEAN;

-- AlterTable
ALTER TABLE "passengers" ADD COLUMN     "last_lat" DECIMAL(10,8),
ADD COLUMN     "last_lng" DECIMAL(11,8);

-- AlterTable
ALTER TABLE "ride_confirmations" ADD COLUMN     "created_ride_id" TEXT,
ADD COLUMN     "is_used" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "diamond_candidate_driver_id" TEXT,
ADD COLUMN     "diamond_state" TEXT,
ADD COLUMN     "fallback_out_of_fence" BOOLEAN DEFAULT false,
ADD COLUMN     "is_diamond_eligible" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "tour_bookings" ADD COLUMN     "ride_id" TEXT;

-- AlterTable
ALTER TABLE "tour_packages" ADD COLUMN     "created_by" TEXT;

