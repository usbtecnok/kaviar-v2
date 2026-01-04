-- AlterTable
ALTER TABLE "community_status_history" ADD COLUMN     "from_is_active" BOOLEAN;

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "subject_id" TEXT,
ADD COLUMN     "subject_type" TEXT;

-- AlterTable
ALTER TABLE "diamond_audit_logs" ADD COLUMN     "driver_id" TEXT;

-- AlterTable
ALTER TABLE "driver_documents" ADD COLUMN     "file_url" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "driver_enforcement_history" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "driver_verifications" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "community_id" TEXT,
ADD COLUMN     "eligibility_checked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "passengers" ADD COLUMN     "last_location_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ratings" ADD COLUMN     "rated_id" TEXT,
ADD COLUMN     "ride_id" TEXT,
ADD COLUMN     "score" INTEGER;

-- AlterTable
ALTER TABLE "ride_confirmations" ADD COLUMN     "used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "bonus_applied_at" TIMESTAMP(3),
ADD COLUMN     "diamond_lost_reason" TEXT,
ADD COLUMN     "passenger_confirmed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tour_bookings" ADD COLUMN     "confirmed_by" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "consent_user_id_type_key" ON "consents"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "consent_subject_type_subject_id_type_key" ON "consents"("subject_type", "subject_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "driver_verifications_driver_id_key" ON "driver_verifications"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_ride_id_user_id_key" ON "ratings"("ride_id", "user_id");

