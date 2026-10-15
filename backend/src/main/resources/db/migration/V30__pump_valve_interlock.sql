-- Optional device-reported local simulator protection. No backfill or enablement.
ALTER TABLE pump_status ADD COLUMN valve_interlock JSONB
 CHECK(valve_interlock IS NULL OR jsonb_typeof(valve_interlock)='object');
