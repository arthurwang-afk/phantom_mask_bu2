-- Revert: change open_time and close_time from TIME back to TEXT
ALTER TABLE "pharmacy_hours"
  ALTER COLUMN "open_time"  TYPE TEXT USING to_char("open_time",  'HH24:MI'),
  ALTER COLUMN "close_time" TYPE TEXT USING to_char("close_time", 'HH24:MI');
