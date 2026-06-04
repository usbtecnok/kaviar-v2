-- Código público de captação por membro da equipe do gestor
-- Migration aditiva — ALTER TABLE apenas, não altera dados existentes.
-- Rollback: ALTER TABLE manager_team_members DROP COLUMN public_referral_code; ALTER TABLE manager_team_members DROP COLUMN referral_code_active;

ALTER TABLE "manager_team_members"
ADD COLUMN "public_referral_code" VARCHAR(30) UNIQUE;

ALTER TABLE "manager_team_members"
ADD COLUMN "referral_code_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "idx_team_members_referral_code"
ON "manager_team_members"("public_referral_code");
