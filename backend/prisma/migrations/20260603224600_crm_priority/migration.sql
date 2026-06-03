-- AlterTable: add priority column
ALTER TABLE "crm_leads" ADD COLUMN "priority" VARCHAR(10) NOT NULL DEFAULT 'NORMAL';

-- CreateIndex
CREATE INDEX "idx_crm_leads_priority" ON "crm_leads"("priority");
