-- AlterTable
ALTER TABLE "community_status_history" ADD COLUMN     "driver_count" INTEGER;

-- AlterTable
ALTER TABLE "diamond_audit_logs" ADD COLUMN     "diamond_state_to" TEXT;

-- AlterTable
ALTER TABLE "driver_documents" ADD COLUMN     "reject_reason" TEXT,
ALTER COLUMN "document_url" SET DEFAULT '';

-- AlterTable
ALTER TABLE "ratings" ADD COLUMN     "rater_type" TEXT;

