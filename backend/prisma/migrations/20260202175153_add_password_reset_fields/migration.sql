-- Add password reset fields to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_admins_reset_token ON admins(reset_token) WHERE reset_token IS NOT NULL;
