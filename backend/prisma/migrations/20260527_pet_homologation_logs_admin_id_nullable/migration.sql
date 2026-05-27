-- Allow automated logs (e.g. Google Forms intake) without an admin user
ALTER TABLE "pet_homologation_logs" ALTER COLUMN "admin_id" DROP NOT NULL;
