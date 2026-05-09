-- CRM Prospection: add address, website, verified; make phone optional
ALTER TABLE "local_operators" ADD COLUMN "address" TEXT;
ALTER TABLE "local_operators" ADD COLUMN "website" TEXT;
ALTER TABLE "local_operators" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "local_operators" ALTER COLUMN "phone" DROP NOT NULL;
