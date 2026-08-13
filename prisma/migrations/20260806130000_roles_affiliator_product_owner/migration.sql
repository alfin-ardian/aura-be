-- Role model: SUPER_ADMIN | AFFILIATOR
-- Migrate legacy USER/ADMIN values and add product.owner_id

CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'AFFILIATOR');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'SUPER_ADMIN'::"Role_new"
      WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"Role_new"
      WHEN 'AFFILIATOR' THEN 'AFFILIATOR'::"Role_new"
      ELSE 'AFFILIATOR'::"Role_new"
    END
  );

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'AFFILIATOR'::"Role";

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "owner_id" UUID;
CREATE INDEX IF NOT EXISTS "products_owner_id_idx" ON "products"("owner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_owner_id_fkey'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
