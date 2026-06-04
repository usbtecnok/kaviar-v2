-- Comissões internas do Gestor Territorial para membros da equipe
-- Controle informativo apenas — não representa pagamento KAVIAR.
-- Migration aditiva — CREATE TABLE apenas, não altera tabelas existentes.
-- Rollback: DROP TABLE manager_team_commissions;

CREATE TABLE "manager_team_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manager_admin_id" TEXT NOT NULL,
    "member_id" UUID NOT NULL,
    "territory_id" TEXT,
    "description" TEXT NOT NULL,
    "amount_cents" INT NOT NULL,
    "reference_month" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_team_commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_manager_team_commissions_admin"
    ON "manager_team_commissions"("manager_admin_id");

CREATE INDEX "idx_manager_team_commissions_member"
    ON "manager_team_commissions"("member_id");

ALTER TABLE "manager_team_commissions"
    ADD CONSTRAINT "manager_team_commissions_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "manager_team_members"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
