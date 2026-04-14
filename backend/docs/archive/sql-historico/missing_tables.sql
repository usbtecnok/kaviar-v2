-- CreateTable
CREATE TABLE "ride_confirmations" (
    "id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "confirmation_token" TEXT NOT NULL,
    "ride_data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_packages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "locations" TEXT[],
    "estimated_duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_bookings" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_stats" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "average_rating" DECIMAL(3,2) NOT NULL,
    "total_ratings" INTEGER NOT NULL,
    "rating_sum" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rating_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ride_confirmations_confirmation_token_key" ON "ride_confirmations"("confirmation_token");

-- CreateIndex
CREATE UNIQUE INDEX "rating_stats_entity_type_entity_id_key" ON "rating_stats"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "ride_confirmations" ADD CONSTRAINT "ride_confirmations_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "tour_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

