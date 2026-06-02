-- KAVIAR Lab: Snapshots Históricos do Score de Maturidade Territorial
-- Migration aditiva — CREATE TABLE apenas, não altera tabelas existentes.
-- Rollback: DROP TABLE lab_maturity_snapshots;

CREATE TABLE "lab_maturity_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "neighborhood_id" TEXT NOT NULL,
    "territory_id" TEXT,
    "period_days" INTEGER NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "maturity_score" INTEGER NOT NULL,
    "maturity_status" TEXT NOT NULL,
    "methodology_version" TEXT NOT NULL DEFAULT 'v1',
    "components" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_maturity_snapshots_pkey" PRIMARY KEY ("id")
);

-- Previne duplicidade: um snapshot por bairro/período/dia
CREATE UNIQUE INDEX "lab_maturity_snapshots_neighborhood_id_period_days_snapshot_da_key"
    ON "lab_maturity_snapshots"("neighborhood_id", "period_days", "snapshot_date");

-- Busca de histórico por bairro
CREATE INDEX "lab_maturity_snapshots_neighborhood_id_snapshot_date_idx"
    ON "lab_maturity_snapshots"("neighborhood_id", "snapshot_date" DESC);

-- Busca de snapshots por data
CREATE INDEX "lab_maturity_snapshots_snapshot_date_idx"
    ON "lab_maturity_snapshots"("snapshot_date" DESC);

-- FK para neighborhoods
ALTER TABLE "lab_maturity_snapshots"
    ADD CONSTRAINT "lab_maturity_snapshots_neighborhood_id_fkey"
    FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
