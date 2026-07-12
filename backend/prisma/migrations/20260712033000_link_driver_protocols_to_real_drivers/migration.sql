-- AlterTable
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD COLUMN "driver_id" TEXT;

-- AddForeignKey
ALTER TABLE "municipal_regulatory_driver_protocols"
ADD CONSTRAINT "municipal_regulatory_driver_protocols_driver_id_fkey"
FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "municipal_regulatory_driver_protocols_case_id_driver_id_idx"
ON "municipal_regulatory_driver_protocols"("case_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_regulatory_driver_protocols_case_id_driver_id_key"
ON "municipal_regulatory_driver_protocols"("case_id", "driver_id");
