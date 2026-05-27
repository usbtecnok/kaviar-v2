-- Link pet homologation to official KAVIAR driver
ALTER TABLE "pet_homologations" ADD COLUMN "driver_id" VARCHAR(255);
CREATE INDEX "idx_pet_homologations_driver_id" ON "pet_homologations"("driver_id");
