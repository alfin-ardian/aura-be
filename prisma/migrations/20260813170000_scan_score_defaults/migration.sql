-- Align Prisma schema with columns that already exist from init.
-- Ensure NOT NULL columns have a default so older insert paths cannot fail.
ALTER TABLE "scans" ALTER COLUMN "acne" SET DEFAULT 0;
ALTER TABLE "scans" ALTER COLUMN "oiliness" SET DEFAULT 0;
ALTER TABLE "scans" ALTER COLUMN "redness" SET DEFAULT 0;
