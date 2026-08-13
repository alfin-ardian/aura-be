-- Traceability for adaptive learning: record model output + version per scan.
ALTER TABLE "scans"
ADD COLUMN IF NOT EXISTS "skin_type" TEXT,
ADD COLUMN IF NOT EXISTS "concerns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "model_version" TEXT;
