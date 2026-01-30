-- Add password change tracking to admins
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

-- Update existing admins to not require password change (legacy)
UPDATE admins 
SET must_change_password = false, 
    password_changed_at = NOW()
WHERE must_change_password IS NULL;
