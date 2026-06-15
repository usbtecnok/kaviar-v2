-- AlterTable: add image metadata to commerce_products
ALTER TABLE "commerce_products" ADD COLUMN "image_key" TEXT;
ALTER TABLE "commerce_products" ADD COLUMN "image_mime_type" VARCHAR(50);
ALTER TABLE "commerce_products" ADD COLUMN "image_size_bytes" INTEGER;
ALTER TABLE "commerce_products" ADD COLUMN "image_updated_at" TIMESTAMPTZ;
