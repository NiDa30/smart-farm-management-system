-- Optional device report only. Never backfill, enable firmware or authorize ON.
ALTER TABLE pump_status ADD COLUMN durable_safety jsonb;
