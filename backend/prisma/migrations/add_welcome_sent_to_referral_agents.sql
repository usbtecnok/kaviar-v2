-- Migration: add_welcome_sent_to_referral_agents
-- Rastreabilidade do envio automático do link de boas-vindas ao consultor

ALTER TABLE "referral_agents"
  ADD COLUMN IF NOT EXISTS "welcome_sent_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "welcome_sent_status" TEXT;
