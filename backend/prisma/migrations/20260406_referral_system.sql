-- Referral Agents: quem indica motoristas
CREATE TABLE IF NOT EXISTS referral_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  pix_key TEXT,
  pix_key_type TEXT, -- CPF, PHONE, EMAIL, RANDOM
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Referrals: cada indicação individual
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES referral_agents(id),
  driver_id TEXT,
  driver_phone TEXT NOT NULL,
  lead_id UUID,
  status TEXT DEFAULT 'pending', -- pending, qualified, rejected
  reward_amount DECIMAL(10,2) DEFAULT 20.00,
  qualified_at TIMESTAMP(3),
  rejected_at TIMESTAMP(3),
  rejection_reason TEXT,
  payment_status TEXT DEFAULT 'pending_pix', -- pending_pix, pending_approval, approved, paid, canceled
  payment_approved_at TIMESTAMP(3),
  payment_approved_by TEXT,
  payment_paid_at TIMESTAMP(3),
  payment_paid_by TEXT,
  payment_ref TEXT,
  payment_canceled_at TIMESTAMP(3),
  payment_cancel_reason TEXT,
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Constraints de integridade
CREATE UNIQUE INDEX IF NOT EXISTS referrals_driver_id_unique ON referrals(driver_id) WHERE driver_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS referrals_driver_phone_unique ON referrals(driver_phone);

-- Índices de performance
CREATE INDEX IF NOT EXISTS referrals_agent_id_idx ON referrals(agent_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);
CREATE INDEX IF NOT EXISTS referrals_payment_status_idx ON referrals(payment_status);
CREATE INDEX IF NOT EXISTS referrals_driver_id_idx ON referrals(driver_id);
CREATE INDEX IF NOT EXISTS referral_agents_phone_idx ON referral_agents(phone);
