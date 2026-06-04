-- Vínculo entre CRM lead e membro da equipe do gestor (captador)
-- Migration aditiva — ALTER TABLE apenas, não altera dados existentes.
-- Rollback: ALTER TABLE crm_leads DROP COLUMN captured_by_member_id;

ALTER TABLE "crm_leads"
ADD COLUMN "captured_by_member_id" UUID REFERENCES "manager_team_members"("id") ON DELETE SET NULL;

CREATE INDEX "idx_crm_leads_captured_by"
ON "crm_leads"("captured_by_member_id");
