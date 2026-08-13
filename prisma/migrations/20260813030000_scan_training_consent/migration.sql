-- Adaptive learning: keep selfie only when guest consents to AI training.
ALTER TABLE "scans"
ADD COLUMN IF NOT EXISTS "training_consent" BOOLEAN NOT NULL DEFAULT false;
