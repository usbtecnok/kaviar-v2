-- CreateEnum
CREATE TYPE "TourPackageType" AS ENUM ('TOUR', 'AIRPORT_TRANSFER');

-- CreateEnum
CREATE TYPE "TourBookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suspension_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "suspended_by" TEXT,
    "last_active_at" TIMESTAMP(3),
    "community_id" TEXT,
    "document_cpf" TEXT,
    "document_rg" TEXT,
    "document_cnh" TEXT,
    "vehicle_plate" TEXT,
    "vehicle_model" TEXT,
    "banned_at" TIMESTAMP(3),
    "banned_reason" TEXT,
    "banned_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "last_location_updated_at" TIMESTAMP(3),
    "last_lat" DECIMAL(10,8),
    "last_lng" DECIMAL(11,8),
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_override" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "community_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_lat" DECIMAL(10,8),
    "last_lng" DECIMAL(11,8),
    "last_location_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT,
    "passenger_id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "price" DECIMAL(10,2) NOT NULL,
    "platform_fee" DECIMAL(10,2),
    "driver_amount" DECIMAL(10,2),
    "payment_method" TEXT DEFAULT 'credit_card',
    "cancel_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "forced_completed_by" TEXT,
    "forced_completed_at" TIMESTAMP(3),
    "fallback_out_of_fence" BOOLEAN DEFAULT false,
    "fallback_reason" TEXT,
    "drivers_in_fence_count" INTEGER,
    "passenger_confirmed_at" TIMESTAMP(3),
    "is_diamond_eligible" BOOLEAN DEFAULT false,
    "diamond_state" TEXT,
    "diamond_candidate_driver_id" TEXT,
    "diamond_lost_at" TIMESTAMP(3),
    "diamond_lost_reason" TEXT,
    "bonus_amount" DECIMAL(10,2),
    "bonus_applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_admin_actions" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_status_history" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "center_lat" DECIMAL(10,8),
    "center_lng" DECIMAL(11,8),
    "radius_meters" INTEGER,
    "min_active_drivers" INTEGER NOT NULL DEFAULT 3,
    "deactivation_threshold" INTEGER NOT NULL DEFAULT 1,
    "auto_activation" BOOLEAN NOT NULL DEFAULT false,
    "last_evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tourist_guides" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "community_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_bilingual" BOOLEAN NOT NULL DEFAULT false,
    "languages" TEXT[],
    "also_driver" BOOLEAN NOT NULL DEFAULT false,
    "driver_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tourist_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_confirmations" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "confirmation_token" TEXT NOT NULL,
    "ride_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_ride_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_packages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TourPackageType" NOT NULL,
    "partner_name" TEXT NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "locations" TEXT[],
    "estimated_duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_bookings" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "status" "TourBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT,
    "total_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ride_id" TEXT,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_stats" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "average_rating" DECIMAL(3,2) NOT NULL,
    "total_ratings" INTEGER NOT NULL,
    "rating_sum" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rating_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_verifications" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "community_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by_admin_id" TEXT,
    "eligibility_checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL DEFAULT '',
    "file_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "verified_by_admin_id" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by_admin_id" TEXT,
    "reject_reason" TEXT,
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
    "metadata" JSONB,
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_enforcement_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_status_history" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "from_is_active" BOOLEAN,
    "to_is_active" BOOLEAN,
    "driver_count" INTEGER,
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diamond_audit_logs" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "bonus_amount" DECIMAL(10,2),
    "diamond_state_from" TEXT,
    "diamond_state_to" TEXT,
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
    "ride_id" TEXT,
    "rated_id" TEXT,
    "rater_id" TEXT,
    "rater_type" TEXT,
    "rating" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "type" TEXT NOT NULL,
    "consent_type" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "accepted_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "passengers_email_key" ON "passengers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_passenger_id_consent_type_key" ON "user_consents"("passenger_id", "consent_type");

-- CreateIndex
CREATE UNIQUE INDEX "tourist_guides_email_key" ON "tourist_guides"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ride_confirmations_confirmation_token_key" ON "ride_confirmations"("confirmation_token");

-- CreateIndex
CREATE UNIQUE INDEX "rating_stats_entity_type_entity_id_key" ON "rating_stats"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_stats_user_id_key" ON "rating_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_verifications_driver_id_key" ON "driver_verifications"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "rating_ride_id_user_id_key" ON "ratings"("ride_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_user_id_type_key" ON "consents"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "consent_subject_type_subject_id_type_key" ON "consents"("subject_type", "subject_id", "type");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_admin_actions" ADD CONSTRAINT "ride_admin_actions_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tourist_guides" ADD CONSTRAINT "tourist_guides_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_confirmations" ADD CONSTRAINT "ride_confirmations_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "tour_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_status_history" ADD CONSTRAINT "community_status_history_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

