-- Migration: add_terms_acceptance_to_referral_agents
-- Rastreabilidade jurídica do aceite de termos pelo consultor/indicador

ALTER TABLE "referral_agents"
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "terms_accepted_ip" TEXT;
