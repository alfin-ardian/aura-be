-- recommendation_products initially only had composite PK columns.
-- Prisma schema expects match_score + explanations for ranked product links.
ALTER TABLE "recommendation_products"
  ADD COLUMN IF NOT EXISTS "match_score" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "recommendation_products"
  ADD COLUMN IF NOT EXISTS "explanations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
