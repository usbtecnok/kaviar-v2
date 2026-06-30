-- Rotas Fixas: tipo de viagem e horarios opcionais por tipo
ALTER TABLE "driver_fixed_routes"
  ADD COLUMN IF NOT EXISTS "trip_type" VARCHAR(30) NOT NULL DEFAULT 'round_trip';

ALTER TABLE "driver_fixed_routes"
  ALTER COLUMN "departure_time" DROP NOT NULL,
  ALTER COLUMN "return_time" DROP NOT NULL;
