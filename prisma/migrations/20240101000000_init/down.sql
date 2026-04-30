-- DropForeignKey (must drop before tables)
ALTER TABLE "purchase_histories" DROP CONSTRAINT IF EXISTS "purchase_histories_mask_id_fkey";
ALTER TABLE "purchase_histories" DROP CONSTRAINT IF EXISTS "purchase_histories_pharmacy_id_fkey";
ALTER TABLE "purchase_histories" DROP CONSTRAINT IF EXISTS "purchase_histories_user_id_fkey";
ALTER TABLE "masks" DROP CONSTRAINT IF EXISTS "masks_pharmacy_id_fkey";
ALTER TABLE "pharmacy_hours" DROP CONSTRAINT IF EXISTS "pharmacy_hours_pharmacy_id_fkey";

-- DropTable (reverse order of creation)
DROP TABLE IF EXISTS "purchase_histories";
DROP TABLE IF EXISTS "masks";
DROP TABLE IF EXISTS "pharmacy_hours";
DROP TABLE IF EXISTS "pharmacies";
DROP TABLE IF EXISTS "users";
