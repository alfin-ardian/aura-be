-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Occasion" AS ENUM ('DAILY', 'WORK', 'PARTY', 'WEDDING', 'CASUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinishPreference" AS ENUM ('MATTE', 'NATURAL', 'DEWY', 'GLOSSY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "budget_max" INTEGER;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "favorite_brands" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "occasion" "Occasion";
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "finish_preference" "FinishPreference";
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "preferred_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
