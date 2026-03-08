-- Add default value to family_bonus_profile
ALTER TABLE "drivers" ALTER COLUMN "family_bonus_profile" SET DEFAULT 'individual';

-- Update existing NULL values to 'individual'
UPDATE "drivers" SET "family_bonus_profile" = 'individual' WHERE "family_bonus_profile" IS NULL;
