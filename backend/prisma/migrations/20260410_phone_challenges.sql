-- Phone challenges table for OTP verification
CREATE TABLE IF NOT EXISTS phone_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  user_id VARCHAR(255),
  purpose VARCHAR(30) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_challenges_lookup ON phone_challenges (phone, purpose, created_at DESC);
CREATE INDEX idx_phone_challenges_user ON phone_challenges (user_id, user_type);

-- Phone verified timestamp on drivers and passengers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
