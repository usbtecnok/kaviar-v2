-- Ajuste wait feature: estimativa de espera para decisão do motorista (não afeta cobrança)
ALTER TABLE rides_v2
  ADD COLUMN IF NOT EXISTS wait_estimated_min INTEGER;
