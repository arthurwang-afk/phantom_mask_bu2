-- CreateTable
CREATE TABLE "pharmacies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cash_balance" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_hours" (
    "id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,

    CONSTRAINT "pharmacy_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masks" (
    "id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock_quantity" INTEGER NOT NULL,

    CONSTRAINT "masks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cash_balance" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_histories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "mask_id" INTEGER NOT NULL,
    "mask_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_name_key" ON "pharmacies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "masks_pharmacy_id_name_key" ON "masks"("pharmacy_id", "name");

-- CreateIndex
CREATE INDEX "pharmacy_hours_day_of_week_open_time_close_time_idx" ON "pharmacy_hours"("day_of_week", "open_time", "close_time");

-- CreateIndex
CREATE INDEX "masks_pharmacy_id_price_idx" ON "masks"("pharmacy_id", "price");

-- CreateIndex
CREATE INDEX "purchase_histories_user_id_transaction_date_idx" ON "purchase_histories"("user_id", "transaction_date");

-- GIN indexes for full-text search
CREATE INDEX ON masks USING GIN (to_tsvector('english', name));
CREATE INDEX ON pharmacies USING GIN (to_tsvector('english', name));

-- AddForeignKey
ALTER TABLE "pharmacy_hours" ADD CONSTRAINT "pharmacy_hours_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masks" ADD CONSTRAINT "masks_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_histories" ADD CONSTRAINT "purchase_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_histories" ADD CONSTRAINT "purchase_histories_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_histories" ADD CONSTRAINT "purchase_histories_mask_id_fkey" FOREIGN KEY ("mask_id") REFERENCES "masks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
