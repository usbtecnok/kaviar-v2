-- AlterTable
ALTER TABLE "communities" ALTER COLUMN "deactivation_threshold" SET NOT NULL,
ALTER COLUMN "min_active_drivers" SET NOT NULL;

-- AlterTable
ALTER TABLE "community_status_history" ADD COLUMN     "changed_by" TEXT;

-- AlterTable
ALTER TABLE "diamond_audit_logs" ADD COLUMN     "reason" TEXT;

-- AddForeignKey
ALTER TABLE "community_status_history" ADD CONSTRAINT "community_status_history_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

