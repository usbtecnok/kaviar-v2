-- AlterTable
ALTER TABLE "community_status_history" ADD COLUMN     "to_is_active" BOOLEAN;

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "consent_type" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "diamond_audit_logs" ADD COLUMN     "diamond_state_from" TEXT;

-- AlterTable
ALTER TABLE "driver_documents" ADD COLUMN     "rejected_by_admin_id" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "verified_by_admin_id" TEXT;

-- AlterTable
ALTER TABLE "driver_verifications" ADD COLUMN     "approved_by_admin_id" TEXT;

-- AlterTable
ALTER TABLE "ratings" ADD COLUMN     "rater_id" TEXT,
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "tour_bookings" ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ALTER COLUMN "total_price" SET DEFAULT 0;

