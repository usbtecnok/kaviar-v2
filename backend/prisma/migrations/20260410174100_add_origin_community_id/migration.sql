-- AlterTable
ALTER TABLE "rides_v2" ADD COLUMN "origin_community_id" TEXT;
ALTER TABLE "rides_v2" ADD COLUMN "is_homebound" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ride_offers" ADD COLUMN "territory_tier" TEXT;
