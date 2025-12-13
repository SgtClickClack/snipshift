-- Add lat/lng columns to shifts table (schema parity)
-- Some environments were created before these columns existed.

ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "lat" numeric(10, 7);
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "lng" numeric(10, 7);

CREATE INDEX IF NOT EXISTS "shifts_lat_lng_idx" ON "shifts" ("lat", "lng");

