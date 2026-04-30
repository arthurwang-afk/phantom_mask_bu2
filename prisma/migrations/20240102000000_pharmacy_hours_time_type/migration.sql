-- AlterTable: change open_time and close_time from TEXT to TIME
ALTER TABLE "pharmacy_hours"
  ALTER COLUMN "open_time"  TYPE TIME USING "open_time"::TIME,
  ALTER COLUMN "close_time" TYPE TIME USING "close_time"::TIME;
