ALTER TABLE referral_agents ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'admin_manual';
