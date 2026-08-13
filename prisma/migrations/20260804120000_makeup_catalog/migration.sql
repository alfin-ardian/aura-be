-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "soco_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Makeup';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subcategory" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "review_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "min_price" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "max_price" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "source_url" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "products_soco_id_key" ON "products"("soco_id");
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products"("category");
CREATE INDEX IF NOT EXISTS "products_subcategory_idx" ON "products"("subcategory");
CREATE INDEX IF NOT EXISTS "products_review_count_idx" ON "products"("review_count" DESC);
