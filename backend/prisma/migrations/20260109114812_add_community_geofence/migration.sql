-- CreateTable
CREATE TABLE "community_geofences" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "center_lat" DECIMAL(10,8) NOT NULL,
    "center_lng" DECIMAL(11,8) NOT NULL,
    "min_lat" DECIMAL(10,8),
    "min_lng" DECIMAL(11,8),
    "max_lat" DECIMAL(10,8),
    "max_lng" DECIMAL(11,8),
    "geojson" TEXT,
    "source" TEXT NOT NULL,
    "source_ref" TEXT,
    "confidence" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_geofences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "community_geofences_community_id_key" ON "community_geofences"("community_id");

-- AddForeignKey
ALTER TABLE "community_geofences" ADD CONSTRAINT "community_geofences_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
