-- Migration: asaas_credit_purchases
-- Tabelas para compra de créditos via Asaas (Pix)

-- Pacotes de créditos
CREATE TABLE IF NOT EXISTS credit_packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  price_cents    INTEGER NOT NULL,
  active         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Compras de créditos
CREATE TABLE IF NOT EXISTS driver_credit_purchases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id          TEXT NOT NULL REFERENCES drivers(id),
  package_id         UUID REFERENCES credit_packages(id),
  asaas_customer_id  TEXT,
  asaas_payment_id   TEXT UNIQUE,
  billing_type       TEXT DEFAULT 'PIX',
  status             TEXT DEFAULT 'pending',
  amount_cents       INTEGER NOT NULL,
  credits_amount     INTEGER NOT NULL,
  external_reference TEXT UNIQUE,
  pix_qr_code        TEXT,
  pix_copy_paste      TEXT,
  pix_expires_at     TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  raw_payload        JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_driver ON driver_credit_purchases(driver_id);
CREATE INDEX IF NOT EXISTS idx_purchases_asaas ON driver_credit_purchases(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON driver_credit_purchases(status);

-- Eventos de webhook para auditoria e retry
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  asaas_payment_id TEXT,
  payload         JSONB NOT NULL,
  status          TEXT DEFAULT 'received',
  processed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_payment ON asaas_webhook_events(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON asaas_webhook_events(status);

-- Campo no motorista para vínculo com Asaas
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Seed: pacotes iniciais (preços editáveis depois)
INSERT INTO credit_packages (name, credits_amount, price_cents) VALUES
  ('10 créditos', 10, 2000),
  ('25 créditos', 25, 4500),
  ('50 créditos', 50, 8000)
ON CONFLICT DO NOTHING;
