-- Product fields used by catalog/recommendation that were never migrated.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "finish" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "undertone_match" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "affiliate_url" TEXT;

CREATE INDEX IF NOT EXISTS "products_finish_idx" ON "products"("finish");
