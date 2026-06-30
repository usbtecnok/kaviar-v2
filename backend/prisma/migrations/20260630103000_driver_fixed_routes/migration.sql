-- KAVIAR Rotas Fixas do Motorista - Backend MVP
CREATE TABLE "driver_fixed_routes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "driver_id" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" VARCHAR(800),
  "origin_label" VARCHAR(160) NOT NULL,
  "destination_label" VARCHAR(160) NOT NULL,
  "departure_time" VARCHAR(5) NOT NULL,
  "return_time" VARCHAR(5) NOT NULL,
  "days_of_week" JSONB NOT NULL,
  "seats_total" INTEGER NOT NULL,
  "price_per_passenger_cents" INTEGER NOT NULL,
  "suggested_price_cents" INTEGER,
  "min_price_cents" INTEGER,
  "max_price_cents" INTEGER,
  "kaviar_fee_percent" DECIMAL(5,2) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'active',
  "invite_code" VARCHAR(40) NOT NULL,
  "territory_id" TEXT,
  "neighborhood_id" TEXT,
  "paused_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "driver_fixed_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "driver_fixed_route_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "route_id" UUID NOT NULL,
  "passenger_id" TEXT NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'confirmed',
  "seats_reserved" INTEGER NOT NULL DEFAULT 1,
  "price_cents" INTEGER NOT NULL,
  "kaviar_fee_percent" DECIMAL(5,2) NOT NULL,
  "kaviar_fee_cents" INTEGER NOT NULL,
  "driver_net_cents" INTEGER NOT NULL,
  "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "cancel_reason" VARCHAR(300),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "driver_fixed_route_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "driver_fixed_route_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "route_id" UUID NOT NULL,
  "reservation_id" UUID,
  "actor_type" VARCHAR(30) NOT NULL,
  "actor_id" TEXT,
  "action" VARCHAR(80) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_fixed_route_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_fixed_routes_invite_code_key" ON "driver_fixed_routes"("invite_code");
CREATE INDEX "driver_fixed_routes_driver_id_status_idx" ON "driver_fixed_routes"("driver_id", "status");
CREATE INDEX "driver_fixed_routes_invite_code_idx" ON "driver_fixed_routes"("invite_code");
CREATE INDEX "driver_fixed_routes_territory_id_idx" ON "driver_fixed_routes"("territory_id");
CREATE INDEX "driver_fixed_routes_neighborhood_id_idx" ON "driver_fixed_routes"("neighborhood_id");
CREATE INDEX "driver_fixed_routes_created_at_idx" ON "driver_fixed_routes"("created_at" DESC);
CREATE INDEX "driver_fixed_route_reservations_route_id_status_idx" ON "driver_fixed_route_reservations"("route_id", "status");
CREATE INDEX "driver_fixed_route_reservations_passenger_id_status_idx" ON "driver_fixed_route_reservations"("passenger_id", "status");
CREATE INDEX "driver_fixed_route_reservations_created_at_idx" ON "driver_fixed_route_reservations"("created_at" DESC);
CREATE INDEX "driver_fixed_route_events_route_id_created_at_idx" ON "driver_fixed_route_events"("route_id", "created_at" DESC);
CREATE INDEX "driver_fixed_route_events_reservation_id_idx" ON "driver_fixed_route_events"("reservation_id");
CREATE INDEX "driver_fixed_route_events_actor_type_actor_id_idx" ON "driver_fixed_route_events"("actor_type", "actor_id");
CREATE INDEX "driver_fixed_route_events_action_idx" ON "driver_fixed_route_events"("action");

ALTER TABLE "driver_fixed_routes" ADD CONSTRAINT "driver_fixed_routes_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "driver_fixed_route_reservations" ADD CONSTRAINT "driver_fixed_route_reservations_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "driver_fixed_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "driver_fixed_route_reservations" ADD CONSTRAINT "driver_fixed_route_reservations_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "driver_fixed_route_events" ADD CONSTRAINT "driver_fixed_route_events_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "driver_fixed_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "driver_fixed_route_events" ADD CONSTRAINT "driver_fixed_route_events_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "driver_fixed_route_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
