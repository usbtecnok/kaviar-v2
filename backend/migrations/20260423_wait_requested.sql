-- MVP "Levar e esperar": adiciona suporte a subfluxo de espera em rides_v2
ALTER TABLE rides_v2
  ADD COLUMN IF NOT EXISTS wait_requested  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wait_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wait_ended_at   TIMESTAMPTZ;
