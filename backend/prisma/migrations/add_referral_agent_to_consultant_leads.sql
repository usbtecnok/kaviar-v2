-- Migration: add_referral_agent_to_consultant_leads
-- Vincula consultant_leads ao referral_agent criado na conversão

ALTER TABLE "consultant_leads"
  ADD COLUMN "referral_agent_id" TEXT;

ALTER TABLE "consultant_leads"
  ADD CONSTRAINT "consultant_leads_referral_agent_id_fkey"
  FOREIGN KEY ("referral_agent_id")
  REFERENCES "referral_agents"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "consultant_leads_referral_agent_id_idx" ON "consultant_leads"("referral_agent_id");
