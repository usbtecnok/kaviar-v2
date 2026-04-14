-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "banned_by" TEXT,
ADD COLUMN     "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "rating_stats" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "bonus_amount" DECIMAL(10,2),
ADD COLUMN     "diamond_lost_at" TIMESTAMP(3),
ADD COLUMN     "drivers_in_fence_count" INTEGER,
ADD COLUMN     "fallback_reason" TEXT;

-- CreateTable
CREATE TABLE "driver_verifications" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_enforcement_history" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_enforcement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_status_history" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diamond_audit_logs" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diamond_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rating_stats_user_id_key" ON "rating_stats"("user_id");

