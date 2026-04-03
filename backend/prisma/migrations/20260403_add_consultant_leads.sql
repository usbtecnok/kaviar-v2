-- CreateTable: consultant_leads
CREATE TABLE "consultant_leads" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consultant_leads_status_idx" ON "consultant_leads"("status");
CREATE INDEX "consultant_leads_created_at_idx" ON "consultant_leads"("created_at" DESC);
