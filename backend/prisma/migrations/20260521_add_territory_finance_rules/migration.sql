-- CreateTable: territory_finance_rules (simulação financeira territorial)
-- Modelo B: uma configuração por território, apenas simulação nesta fase.

CREATE TABLE "territory_finance_rules" (
    "id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "matrix_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "regional_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "partner_commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "min_monthly_fee_cents" INTEGER,
    "revenue_threshold_cents" INTEGER,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territory_finance_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "territory_finance_rules_territory_id_idx" ON "territory_finance_rules"("territory_id");
CREATE INDEX "territory_finance_rules_is_active_idx" ON "territory_finance_rules"("is_active");

ALTER TABLE "territory_finance_rules" ADD CONSTRAINT "territory_finance_rules_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "operational_territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
