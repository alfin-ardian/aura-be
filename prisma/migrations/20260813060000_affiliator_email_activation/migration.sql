-- Affiliator self-register: WhatsApp + email activation
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

CREATE TABLE IF NOT EXISTS "email_activation_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_activation_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_activation_tokens_token_hash_key" ON "email_activation_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "email_activation_tokens_user_id_idx" ON "email_activation_tokens"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_activation_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "email_activation_tokens"
      ADD CONSTRAINT "email_activation_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
