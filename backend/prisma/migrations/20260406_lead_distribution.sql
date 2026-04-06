-- AlterTable: consultant_leads — adicionar campos de distribuição
ALTER TABLE "consultant_leads" ADD COLUMN "assigned_to" TEXT;
ALTER TABLE "consultant_leads" ADD COLUMN "assigned_at" TIMESTAMP(3);
ALTER TABLE "consultant_leads" ADD COLUMN "region" TEXT;
ALTER TABLE "consultant_leads" ADD COLUMN "last_contact_at" TIMESTAMP(3);

-- AlterTable: admins — regiões que o funcionário atende
ALTER TABLE "admins" ADD COLUMN "lead_regions" TEXT;

-- Index para queries de performance por funcionário
CREATE INDEX "consultant_leads_assigned_to_idx" ON "consultant_leads"("assigned_to");
CREATE INDEX "consultant_leads_region_idx" ON "consultant_leads"("region");
