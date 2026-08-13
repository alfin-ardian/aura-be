-- Align scans table with makeup/beauty analysis schema (skin_tone / undertone / face_shape).
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "skin_tone" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "undertone" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "scans" ADD COLUMN IF NOT EXISTS "face_shape" TEXT NOT NULL DEFAULT 'Unknown';

-- skin_type became optional in schema (was NOT NULL in init).
ALTER TABLE "scans" ALTER COLUMN "skin_type" DROP NOT NULL;
